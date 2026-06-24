<script setup lang="ts">
import { useChatbot } from '../../composables/useChatbot'
import { aiService } from '../../services/aiService'

const {
  chatDraft,
  chatLoading,
  chatMessages,
  chatMessagesEl,
  chatOpen,
  appendAssistantMessage,
  appendUserMessage,
  normalizeChatContent,
  toggleChat,
} = useChatbot()

function chatTime(date: string) {
  const dt = new Date(date)
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
}

function onChatKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  void submitChat()
}

function apiErrorMessage(error: unknown) {
  const anyError = error as { response?: { data?: unknown; status?: number }; message?: string }
  const data = anyError.response?.data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    return String(obj.message ?? obj.error ?? `API 오류 (${anyError.response?.status ?? ''})`)
  }
  return anyError.message || 'API 요청에 실패했습니다.'
}

async function submitChat() {
  const message = chatDraft.value.trim()
  if (!message || chatLoading.value) return
  chatDraft.value = ''
  appendUserMessage(message)
  chatLoading.value = true
  try {
    const result = await aiService.chat(message)
    appendAssistantMessage(result.content || '', result.createdAt || new Date().toISOString())
  } catch (error) {
    appendAssistantMessage(normalizeChatContent(apiErrorMessage(error)))
  } finally {
    chatLoading.value = false
  }
}
</script>

<template>
  <div class="chatbot-widget" :class="{ open: chatOpen }">
    <Transition name="chat-panel">
      <section v-if="chatOpen" class="chatbot-panel" aria-label="AI 챗봇">
        <header>
          <div>
            <span>바다모여 AI</span>
            <strong>예보 기반 추천</strong>
          </div>
          <button type="button" aria-label="챗봇 닫기" @click="toggleChat">×</button>
        </header>
        <div ref="chatMessagesEl" class="chatbot-messages" role="log" aria-live="polite">
          <article v-for="message in chatMessages" :key="message.id" class="chat-message" :class="message.role">
            <p>{{ message.content }}</p>
            <time>{{ chatTime(message.createdAt) }}</time>
          </article>
          <article v-if="chatLoading" class="chat-message assistant loading">
            <span aria-hidden="true"></span>
            <p>예보를 확인하고 답변을 작성하는 중입니다.</p>
          </article>
        </div>
        <form class="chatbot-composer" @submit.prevent="submitChat">
          <textarea
            v-model="chatDraft"
            maxlength="2000"
            rows="2"
            placeholder="예: 내일 제주 서핑 추천해줘"
            :disabled="chatLoading"
            @keydown="onChatKeydown"
          ></textarea>
          <button type="submit" :disabled="!chatDraft.trim() || chatLoading" aria-label="메시지 보내기">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12 20 4l-5.2 16-3.1-6.7L4 12Zm7.9-.8 1.7 3.7 2.5-7.6-7.2 3.6 3 .3Z" />
            </svg>
          </button>
        </form>
      </section>
    </Transition>
    <button class="chatbot-toggle" type="button" :aria-expanded="chatOpen" :aria-label="chatOpen ? 'AI 챗봇 닫기' : 'AI 챗봇 열기'" @click="toggleChat">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h14a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-6.2L7 21v-4H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h4v2l3.2-2H19a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5Z" />
      </svg>
      <span>AI</span>
    </button>
  </div>
</template>

<style scoped>
.chatbot-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 110;
  display: grid;
  justify-items: end;
  gap: 12px;
  pointer-events: none;
}

.chatbot-panel,
.chatbot-toggle {
  pointer-events: auto;
}

.chatbot-panel {
  width: min(380px, calc(100vw - 32px));
  height: min(560px, calc(100vh - 120px));
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(14px);
}

.chatbot-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(14, 165, 169, 0.08));
}

.chatbot-panel header div {
  display: grid;
  gap: 3px;
}

.chatbot-panel header span {
  color: var(--primary);
  font-size: 12px;
  font-weight: 900;
}

.chatbot-panel header strong {
  font-size: 17px;
}

.chatbot-panel header button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: white;
  color: var(--foreground);
  font-size: 20px;
  line-height: 1;
}

.chatbot-messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 18px;
  background: var(--background);
}

.chat-message {
  max-width: 86%;
  display: grid;
  gap: 6px;
}

.chat-message p {
  margin: 0;
  padding: 12px 14px;
  border-radius: 18px;
  line-height: 1.55;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.chat-message time {
  color: var(--muted);
  font-size: 11px;
  font-weight: 800;
}

.chat-message.assistant {
  align-self: flex-start;
}

.chat-message.assistant p {
  border: 1px solid var(--border);
  border-top-left-radius: 6px;
  background: white;
  color: var(--foreground);
}

.chat-message.user {
  align-self: flex-end;
  justify-items: end;
}

.chat-message.user p {
  border-top-right-radius: 6px;
  background: var(--primary);
  color: white;
}

.chat-message.loading {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--muted);
}

.chat-message.loading span {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--primary);
  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.24);
  animation: analysisPulse 1.4s ease-out infinite;
}

.chat-message.loading p {
  color: var(--muted);
}

.chatbot-composer {
  display: grid;
  grid-template-columns: 1fr 44px;
  gap: 10px;
  padding: 14px;
  border-top: 1px solid var(--border);
  background: white;
}

.chatbot-composer textarea {
  min-height: 44px;
  max-height: 110px;
  resize: none;
  border-radius: 18px;
}

.chatbot-composer button,
.chatbot-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: var(--primary);
  color: white;
  box-shadow: var(--shadow);
}

.chatbot-composer button {
  width: 44px;
  height: 44px;
  border-radius: 999px;
}

.chatbot-composer button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.chatbot-composer svg,
.chatbot-toggle svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.chatbot-toggle {
  gap: 8px;
  height: 56px;
  padding: 0 18px;
  border-radius: 999px;
  font-weight: 900;
}

.chat-panel-enter-active,
.chat-panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.chat-panel-enter-from,
.chat-panel-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@keyframes analysisPulse {
  70% {
    box-shadow: 0 0 0 9px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

@media (max-width: 620px) {
  .chatbot-widget {
    right: 16px;
    bottom: 16px;
    left: 16px;
  }

  .chatbot-panel {
    width: 100%;
    height: min(560px, calc(100vh - 104px));
    border-radius: 20px;
  }

  .chatbot-toggle {
    height: 52px;
  }
}
</style>
