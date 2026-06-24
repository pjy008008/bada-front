import { aiApi } from '../lib/api'

export const aiService = {
  chat(message: string) {
    return aiApi.chat(message)
  },
}
