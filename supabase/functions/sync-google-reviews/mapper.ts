import type { GoogleReview, ReviewRow } from "@shared/types.ts";
import { STAR_RATING_MAP } from "@shared/types.ts";

export function mapGoogleReview(
  gr: GoogleReview,
  detectedLang: string,
  placeId: string,
): Omit<ReviewRow, "is_visible"> {
  const comment = gr.comment ?? "";
  return {
    id: gr.name,
    author_name: gr.reviewer.displayName,
    author_photo_url: gr.reviewer.profilePhotoUrl ?? null,
    rating: STAR_RATING_MAP[gr.starRating],
    content_original: comment,
    content_fr: detectedLang === "fr" ? comment : null,
    content_en: detectedLang === "en" ? comment : null,
    original_lang: detectedLang,
    review_url: `https://search.google.com/local/reviews?placeid=${placeId}`,
    published_at: gr.createTime,
    updated_at_google: gr.updateTime ?? null,
  };
}
