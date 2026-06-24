<script setup lang="ts">
import type { Page } from '../../types/navigation'

type HeaderUser = {
  loggedIn: boolean
  name: string
  email: string
  avatarUrl: string
}

defineProps<{
  headerQuery: string
  page: Page
  profileMenuOpen: boolean
  user: HeaderUser
}>()

const emit = defineEmits<{
  goAll: []
  navigate: [path: string]
  signOut: []
  submitSearch: []
  'update:headerQuery': [value: string]
  'update:profileMenuOpen': [value: boolean]
}>()
</script>

<template>
  <nav class="site-header">
    <button class="brand" type="button" @click="emit('navigate', '/')">바다모여</button>
    <div class="nav-links">
      <button :class="{ active: page === 'home' }" type="button" @click="emit('navigate', '/')">대시보드</button>
      <button :class="{ active: page === 'all' }" type="button" @click="emit('goAll')">모두 보기</button>
      <button :class="{ active: page === 'community' }" type="button" @click="emit('navigate', '/community')">커뮤니티</button>
    </div>
    <form class="header-search" @submit.prevent="emit('submitSearch')">
      <span>Search</span>
      <input :value="headerQuery" type="search" placeholder="스팟 또는 지역 검색..." @input="emit('update:headerQuery', ($event.target as HTMLInputElement).value)" />
    </form>
    <button v-if="!user.loggedIn" class="btn primary small" type="button" @click="emit('navigate', '/auth')">로그인</button>
    <div v-else class="profile-menu">
      <button class="avatar" type="button" aria-label="프로필 메뉴" @click="emit('update:profileMenuOpen', !profileMenuOpen)">
        <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" />
        <span v-else>{{ user.name.charAt(0).toUpperCase() }}</span>
      </button>
      <div v-if="profileMenuOpen" class="profile-popover">
        <div class="profile-summary">
          <strong>{{ user.name || '사용자' }}</strong>
          <span>{{ user.email }}</span>
        </div>
        <button type="button" @click="emit('navigate', '/settings')">설정</button>
        <button type="button" @click="emit('navigate', '/me')">내 활동 보기</button>
        <button type="button" @click="emit('signOut')">로그아웃</button>
      </div>
    </div>
  </nav>
</template>
