import { FC } from 'react';
import { FiCheckCircle, FiBookOpen, FiHash, FiTarget, FiLayers, FiAward } from 'react-icons/fi';
import { AssistantQuestion } from '@/types/assistant';

interface StructuredAnswersProps {
  answers: AssistantQuestion[];
}

const StructuredAnswers: FC<StructuredAnswersProps> = ({ answers }) => {
  const groupedAnswers = answers.reduce((groups, answer) => {
    const section = answer.section || 'General Questions';
    if (!groups[section]) {
      groups[section] = [];
    }
    groups[section].push(answer);
    return groups;
  }, {} as Record<string, AssistantQuestion[]>);

  const getSectionIcon = (section: string) => {
    if (section.toLowerCase().includes('multiple choice') || section.toLowerCase().includes('mcq')) {
      return <FiTarget className="text-blue-500" size={18} />;
    }
    if (section.toLowerCase().includes('short') || section.toLowerCase().includes('brief')) {
      return <FiLayers className="text-green-500" size={18} />;
    }
    if (section.toLowerCase().includes('fill') || section.toLowerCase().includes('blank')) {
      return <FiAward className="text-purple-500" size={18} />;
    }
    return <FiBookOpen className="text-indigo-500" size={18} />;
  };

  const getSectionColor = (section: string) => {
    if (section.toLowerCase().includes('multiple choice') || section.toLowerCase().includes('mcq')) {
      return 'bg-primary-50 border-primary-200';
    }
    if (section.toLowerCase().includes('short') || section.toLowerCase().includes('brief')) {
      return 'bg-success-50 border-success-200';
    }
    if (section.toLowerCase().includes('fill') || section.toLowerCase().includes('blank')) {
      return 'bg-warning-50 border-warning-200';
    }
    return 'bg-default-50 border-default-200';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6 p-4 bg-success-50 rounded-2xl border border-success-200">
        <div className="p-2 bg-success-600 rounded-xl text-white shadow-lg">
          <FiCheckCircle size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-success-800">
            {answers.length} Questions Answered Successfully
          </h3>
          <p className="text-sm text-success-600">
            Organized across {Object.keys(groupedAnswers).length} section{Object.keys(groupedAnswers).length > 1 ? 's' : ''}
          </p>
        </div>
      </div>
      
      {Object.entries(groupedAnswers).map(([section, sectionAnswers]) => (
        <div key={section} className={`${getSectionColor(section)} rounded-2xl p-6 border-2 shadow-lg`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-sidebar rounded-xl shadow-md">
              {getSectionIcon(section)}
            </div>
            <div>
              <h4 className="text-xl font-bold text-default-800">
                {section}
              </h4>
              <p className="text-sm text-default-600">
                {sectionAnswers.length} question{sectionAnswers.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            {sectionAnswers.map((answer, index) => (
              <div 
                key={index} 
                className="bg-sidebar backdrop-blur-sm rounded-2xl p-6 border border-default-200 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-600 text-white rounded-2xl flex items-center justify-center text-lg font-bold shadow-lg">
                    {answer.question_number || index + 1}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                      <div className="flex items-center gap-2 mb-3">
                        <FiHash size={14} className="text-primary-500" />
                        <span className="text-sm font-semibold text-primary-700 uppercase tracking-wide">
                          Question {answer.question_number}
                        </span>
                        {answer.question_type && (
                          <span className="px-2 py-1 bg-primary-100 text-primary-600 rounded-lg text-xs font-medium">
                            {answer.question_type}
                          </span>
                        )}
                      </div>
                      <p className="text-default-800 font-medium leading-relaxed">
                        {answer.question}
                      </p>
                      {answer.options_with_answer && (
                        <div className="mt-3 p-3 bg-sidebar rounded-lg border border-default-200">
                          <p className="text-sm text-default-700 font-mono">
                            {answer.options_with_answer}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-success-50 rounded-xl p-4 border border-success-200">
                      <div className="flex items-center gap-2 mb-3">
                        <FiCheckCircle size={14} className="text-success-500" />
                        <span className="text-sm font-semibold text-success-700 uppercase tracking-wide">
                          Answer
                        </span>
                      </div>
                      <p className="text-default-800 leading-relaxed">
                        {answer.answer}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3">
                        {answer.section && answer.section !== 'No Section' && (
                          <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-xl text-sm font-medium">
                            {answer.section}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-default-500 bg-default-100 px-3 py-1 rounded-lg">
                        {answer.source}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StructuredAnswers;
