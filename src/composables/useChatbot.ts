import { nextTick, ref, watch } from 'vue'
import type { ChatMessage } from '../types/chat'

export function useChatbot() {
  const chatOpen = ref(false)
  const chatDraft = ref('')
  const chatLoading = ref(false)
  const chatMessagesEl = ref<HTMLDivElement | null>(null)
  const chatMessages = ref<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: '궁금한 날짜, 지역, 체험을 알려주시면 바다모여 예보를 기준으로 짧게 답변해 드릴게요.',
      createdAt: new Date().toISOString(),
    },
  ])
  let chatMessageId = 1

  watch([() => chatMessages.value.length, chatLoading], () => {
    void scrollChatToBottom()
  })

  function toggleChat() {
    chatOpen.value = !chatOpen.value
    if (chatOpen.value) void scrollChatToBottom()
  }

  async function scrollChatToBottom() {
    await nextTick()
    if (chatMessagesEl.value) chatMessagesEl.value.scrollTop = chatMessagesEl.value.scrollHeight
  }

  function normalizeChatContent(content: string) {
    const text = content.trim()
    if (text.toLowerCase().includes('failed to execute gms function call')) {
      return '요청하신 조건에 맞는 예보 정보를 찾지 못했습니다. 날짜, 지역, 체험 종류를 조금 더 구체적으로 입력해 주세요.'
    }
    return text || '답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }

  function appendUserMessage(content: string) {
    chatMessages.value.push({ id: ++chatMessageId, role: 'user', content, createdAt: new Date().toISOString() })
  }

  function appendAssistantMessage(content: string, createdAt = new Date().toISOString()) {
    chatMessages.value.push({
      id: ++chatMessageId,
      role: 'assistant',
      content: normalizeChatContent(content),
      createdAt,
    })
  }

  return {
    chatDraft,
    chatLoading,
    chatMessages,
    chatMessagesEl,
    chatOpen,
    appendAssistantMessage,
    appendUserMessage,
    normalizeChatContent,
    toggleChat,
  }
}
