export interface ReviewRow {
  id: string;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  content_original: string;
  content_fr: string | null;
  content_en: string | null;
  original_lang: string;
  review_url: string;
  published_at: string;
  updated_at_google: string | null;
  is_visible?: boolean;
}

export interface GoogleReview {
  name: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime: string;
  updateTime?: string;
}

export interface GoogleReviewsResponse {
  reviews?: GoogleReview[];
  nextPageToken?: string;
  averageRating?: number;
  totalReviewCount?: number;
}

export const STAR_RATING_MAP: Record<GoogleReview['starRating'], number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};
