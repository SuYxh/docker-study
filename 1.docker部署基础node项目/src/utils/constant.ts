export const MESSAGE_STORE = 'ai_assistant_message'
export const SESSION_STORE = 'ai_assistant_session'
export const ASSISTANT_STORE = 'ai_assistant_assistant'

export const MAX_TOKEN = 1000
export const TEAMPERATURE = 0.8

export const ASSISTANT_INIT = [
  {
    name: 'AI 助手',
    prompt: '你是一个智慧的 AI 助手，任务是详细地回答用户的每个问题',
    temperature: 0.7,
    max_log: 4,
    max_tokens: 800,
  },
]

export const OPENAI_END_POINT = 'https://api.openai.com'

export const USERMAP = {
  user: '👨‍💻‍',
  assistant: '🤖',
  system: '🕸',
}
