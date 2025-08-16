import { toast as hotToast } from 'react-hot-toast';

export const toast = {
    error: (message: string) => hotToast.error(message),
    success: (message: string) => hotToast.success(message),
    info: (message: string) => hotToast(message)
}