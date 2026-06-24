export type CommunityPost = {
  id: string
  spotId: string
  spotName?: string
  region?: string
  title: string
  content: string
  imageUrl: string | null
  imageUrls: string[]
  createdAt: string
  author: string
  authorId?: string
  authorEmail?: string
  likeCount: number
  liked: boolean
  commentCount: number
  comments: CommunityComment[]
}

export type CommunityComment = {
  id: string
  parentId?: string | null
  content: string
  status?: string
  createdAt: string
  updatedAt?: string
  author: string
  authorId?: string
  authorEmail?: string
  children: CommunityComment[]
}
