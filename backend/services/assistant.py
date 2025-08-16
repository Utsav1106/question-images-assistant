from langchain_core.documents import Document
from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings
from services.source import read_sources
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.messages import HumanMessage
from langchain.output_parsers import PydanticOutputParser, OutputFixingParser
from langchain_core.prompts import ChatPromptTemplate
import json
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from typing import Optional
from config import NVIDIA_API_KEY

class Question(BaseModel):
    question: str = Field(description="The exact, full text of the question.")
    question_number: str = Field(description="The original numbering of the question from the content (e.g., '1', 'a)', 'V.').")
    section: Optional[str] = Field(description="The section header this question belongs to (e.g., 'Part A - Multiple Choice').", default="Uncategorized")
    options: Optional[List[str]] = Field(description="A list of options for multiple-choice questions, if any.", default=None)

class QuestionDetectionOutput(BaseModel):
    questions: List[Question] = Field(description="A list of all questions detected in the content.")
    is_more_questions: bool = Field(description="Set to true if you believe there are more questions to process in subsequent batches, false otherwise.")

class Answer(BaseModel):
    question_number: str = Field(description="The original numbering of the question (e.g., '1', 'a)', 'V.').")
    question: str = Field(description="The exact, full text of the question being answered.")
    answer: str = Field(description="A detailed answer based on the provided source materials.")
    source: str = Field(description="Citations from the source material, formatted as 'Source Chunk {RX}, {RY}'.")
    section: str = Field(description="The section header this question belongs to.")
    question_type: str = Field(description="The type of question (e.g., 'Multiple Choice', 'Short Answer').")
    options_with_answer: Optional[str] = Field(description="For MCQs, list options with the correct one marked (e.g., 'A) Option1, B) Option2 \u2713, C) Option3').", default=None)

class AnswerBatchOutput(BaseModel):
    answers: List[Answer] = Field(description="A list of all answers generated for the batch of questions.")

chat_histories = {}

class HomeworkAnswerAssistant:
    def __init__(self, source_name: str):
        self.llm = ChatNVIDIA(
            model="meta/llama-4-maverick-17b-128e-instruct",
            api_key=NVIDIA_API_KEY,
            max_tokens=4096,
        )
        self.embeddings = NVIDIAEmbeddings()
        self.source_name = source_name
        self.vectorstore = None
        self.source_texts = []
        self._setup_knowledge_base()

    def _setup_knowledge_base(self):
        self.source_texts = read_sources(self.source_name)
        if not self.source_texts:
            print("No source texts found!")
            return
        docs = [Document(page_content=text, metadata={"source_id": f"Source_{i+1}", "page": i+1}) 
                for i, text in enumerate(self.source_texts)]
        chunked_docs = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50).split_documents(docs)
        self.vectorstore = FAISS.from_documents(chunked_docs, self.embeddings)

    def get_chat_history(self) -> List[Dict[str, str]]:
        return chat_histories.get(self.source_name, [])

    def add_to_chat_history(self, user_message: str, assistant_response: str):
        if self.source_name not in chat_histories:
            chat_histories[self.source_name] = []
        chat_histories[self.source_name].append({
            "user": user_message,
            "assistant": assistant_response
        })

    def detect_questions(self, ocr_content: str, additional_text: str = "", user_corrections: str = "") -> Dict[str, Any]:
        if not self.vectorstore:
            return {"error": "No knowledge base available"}

        parser = PydanticOutputParser(pydantic_object=QuestionDetectionOutput)
        output_fixer = OutputFixingParser.from_llm(parser=parser, llm=self.llm)

        prompt_template = ChatPromptTemplate.from_template(
            """
            You are a meticulous AI assistant specializing in extracting structured information from text. Your task is to identify and extract all homework questions from the provided content in sequential batches, without missing any and without ever duplicating an entry.

            **CONTENT TO ANALYZE:**
            ---
            {combined_content}
            ---

            **USER CORRECTIONS (apply these to fix any detection errors):**
            ---
            {user_corrections}
            ---

            **ALREADY DETECTED QUESTIONS (DO NOT EXTRACT THESE AGAIN):**
            ---
            {already_detected_questions_json}
            ---

            **YOUR TASK:**
            Identify the next batch of up to **{batch_size}** questions from the content that are NOT in the "ALREADY DETECTED QUESTIONS" list.

            {format_instructions}
            """
        )

        chain = prompt_template | self.llm | output_fixer

        all_detected_questions = []
        seen_question_identifiers = set()

        is_more_questions = True
        batch_size = 15
        max_questions = 200
        combined_content = f"{ocr_content}\n{additional_text}".strip()

        while is_more_questions and len(all_detected_questions) < max_questions:
            already_detected_json = json.dumps(
                [q.model_dump(include={'question_number', 'section', 'question'}) for q in all_detected_questions],
                indent=2
            )

            try:
                response = chain.invoke({
                    "combined_content": combined_content,
                    "user_corrections": user_corrections or "None",
                    "already_detected_questions_json": already_detected_json,
                    "batch_size": batch_size,
                    "format_instructions": parser.get_format_instructions(),
                })

                newly_detected = response.questions if response and response.questions else []

                if not newly_detected:
                    break

                unique_new_questions = []
                for q in newly_detected:
                    identifier = (q.section, q.question_number, q.question.strip())
                    if identifier not in seen_question_identifiers:
                        seen_question_identifiers.add(identifier)
                        unique_new_questions.append(q)

                if not unique_new_questions:
                    break

                all_detected_questions.extend(unique_new_questions)
                is_more_questions = response.is_more_questions

            except Exception as e:
                print(f"An error occurred during question detection: {e}")
                is_more_questions = False

        final_output = QuestionDetectionOutput(
            questions=all_detected_questions,
            is_more_questions=False
        ).model_dump()

        return final_output

    def answer_question_batch(self, section_type: str, questions: List[Any], batch_size: int = 5) -> List[Dict[str, Any]]:
        if not self.vectorstore:
            return [{"error": f"No knowledge base available to answer questions for section '{section_type}'."}]
        all_answers = []
        parser = PydanticOutputParser(pydantic_object=AnswerBatchOutput)
        output_fixer = OutputFixingParser.from_llm(parser=parser, llm=self.llm)

        prompt_template = ChatPromptTemplate.from_template(
            """
            You are an expert homework answering assistant for the section: {section_type}.

            RELEVANT SOURCE CONTEXT:
            ---------------------
            {retrieved_context}
            ---------------------

            QUESTIONS TO ANSWER (JSON format):
            ---------------------
            {questions_json}
            ---------------------

            CRITICAL INSTRUCTIONS:
            1. Answer each question from the "QUESTIONS TO ANSWER" list.
            2. Your answers must be derived from the "RELEVANT SOURCE CONTEXT".
            3. Cite sources for each answer using the `Source Chunk {{R<page_number>}}` format provided in the context.

            {format_instructions}
            """,
        )
        chain = prompt_template | self.llm | output_fixer

        for i in range(0, len(questions), batch_size):
            batch_questions = questions[i:i + batch_size]
            try:
                unique_docs = {} 
                for question in batch_questions:
                    retrieved_docs = self.vectorstore.similarity_search(question.get("question"), k=20)
                    for doc in retrieved_docs:
                        unique_docs[doc.page_content] = doc

                if not unique_docs:
                    retrieved_context = "No relevant source material could be found for the questions in this batch."
                else:
                    retrieved_context = "\n\n".join(
                        [f"Source Chunk {{R{doc.metadata.get('page')}}}: {doc.page_content}" for doc in unique_docs.values()]
                    )

                response = chain.invoke({
                    "section_type": section_type,
                    "retrieved_context": retrieved_context,
                    "questions_json": batch_questions,
                })

                all_answers.extend(response.answers)

            except Exception as e:
                for q in batch_questions:
                    all_answers.append({
                        "question_number": q.get("question_number"),
                        "question": q.get("question"),
                        "answer": f"Error processing question: {str(e)}",
                        "source": "Error in processing",
                        "section": q.get("section"),
                        "question_type": section_type,
                        "options_with_answer": None
                    })
        return [ans.model_dump() for ans in all_answers]

    def answer_all_questions(self, detection_result: Dict[str, Any], ocr_content: str, 
                           additional_text: str = "") -> Dict[str, Any]:
        if not self.vectorstore:
            return {"error": "No knowledge base available for this source."}

        if detection_result.get("error"):
            return detection_result

        all_answers = []
        batch_size = 10
        questions = detection_result.get("questions", [])
        sections = set(question.get("section", "Unknown") for question in questions)
        for section in sections:
            section_questions = list(filter(lambda q: q.get("section") == section, questions))
            if not section_questions:
                continue
            section_answers = self.answer_question_batch(
                section, section_questions, batch_size
            )
            if section_answers:
                all_answers.extend(section_answers)
        if not all_answers:
            return {"error": "No answers generated"}

        markdown_content = self.convert_to_markdown(all_answers, sections)

        return {
            "type": "structured_answers",
            "answers": all_answers,
            "markdown": markdown_content,
            "total_questions": len(all_answers),
            "source_name": self.source_name,
            "sections_summary": {
                section: len([ans for ans in all_answers if ans.get("section") == section])
                for section in sections
            }
        }

    def convert_to_markdown(self, answers: List[Dict[str, Any]], sections: List[str]) -> str:
        markdown = f"# Homework Answers - {self.source_name}\n\n"
        markdown += f"**Total Questions Answered:** {len(answers)}\n\n"

        answers_by_section = {}
        for answer in answers:
            section = answer.get("section", "Unknown")
            qnum = str(answer.get("question_number", "?"))
            if section not in answers_by_section:
                answers_by_section[section] = {}
            answers_by_section[section][qnum] = answer

        for section in sections:
            section_questions = answers_by_section.get(section, {})
            if not section_questions or section not in answers_by_section:
                continue
            markdown += f"## {section}\n\n"
            answered_count = 0
            for qnum in section_questions.keys():
                qnum_str = str(qnum)
                if qnum_str in answers_by_section[section]:
                    answer = answers_by_section[section][qnum_str]
                    answered_count += 1
                    question = answer.get("question", f"Question {qnum} (text not extracted)")
                    ans_text = answer.get("answer", "No answer generated")
                    source = answer.get("source", "No source cited")
                    options = answer.get("options_with_answer")
                    markdown += f"### Question {qnum}\n\n"
                    markdown += f"**Question:** {question}\n\n"
                    if options and options.strip():
                        markdown += f"**Options:** {options}\n\n"
                    markdown += f"**Answer:** {ans_text}\n\n"
                    markdown += f"**Source:** {source}\n\n"
                    markdown += "---\n\n"
                else:
                    markdown += f"### Question {qnum}\n\n"
                    markdown += f"**Question:** Question {qnum} from {section} (not processed)\n\n"
                    markdown += f"**Answer:** *Question was detected but not processed due to an error*\n\n"
                    markdown += "---\n\n"
            markdown += f"*Answered {answered_count} out of {len(section_questions)} questions in this section*\n\n"
        return markdown

    def process_content(self, ocr_content: str, additional_text: str = "", user_corrections: str = "") -> Dict[str, Any]:
        if not self.vectorstore:
            return {"error": "No knowledge base available for this source."}

        detection_result = self.detect_questions(ocr_content, additional_text, user_corrections)

        if detection_result.get("error"):
            return detection_result

        if len(detection_result.get('questions', [])) == 0:
            combined_query = f"{ocr_content} {additional_text}".strip()
            if not combined_query:
                return {"error": "No content provided"}
        
            context_parts = []
            for i, doc in enumerate(self.source_texts):
                context_parts.append(f"Source Chunk {{R{i+1}}} [Page {i+1}]: {doc}")

            context = "\n\n".join(context_parts)
                        
            prompt = f"""
            Based on the source materials, respond to this content:
            
            SOURCE CONTEXT:
            {context}
            
            CONTENT TO RESPOND TO:
            {combined_query}
            
            Provide a helpful response based on the source materials. Use Source Chunk {{RX}} format for citations.
            If the content is not related to the source, mention that and provide your best response anyway but must be relevant.
            If the content is ambiguous or unclear, ask clarifying questions to better understand the user's intent in a clear and concise response.
            """
            
            try:
                response = self.llm.invoke([HumanMessage(content=prompt)])
                markdown_content = f"# Response - {self.source_name}\n\n{response.content}\n\n**Source:** Based on available materials"
                
                return {
                    "type": "single_response",
                    "response": response.content,
                    "markdown": markdown_content,
                    "source_name": self.source_name
                }
            except Exception as e:
                return {"error": f"Failed to generate response: {str(e)}"}
        
        
        print("Step 2: Answering questions...")
        result = self.answer_all_questions(detection_result, ocr_content, additional_text)
        
        if result.get("error"):
            return result
            
        print(f"Successfully generated {len(result.get('answers', []))} answers")
        return result

