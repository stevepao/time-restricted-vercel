"use client";

import { useSearchParams } from "next/navigation";

const messages: Record<string, string> = {
  "auth-expired": "Your WordPress login expired. Please log in and try again.",
  closed: "Comments are closed for this post.",
  error: "Sorry, your comment could not be submitted. Please try again.",
  "login-required": "You must be logged in to post a comment.",
  "missing-fields": "Please fill in all required comment fields.",
  "not-configured": "Comment submission is not configured yet.",
  pending: "Thanks, your comment is awaiting moderation.",
  success: "Thanks, your comment has been posted.",
};

export function CommentStatusMessage() {
  const searchParams = useSearchParams();
  const status = searchParams.get("comment");
  const message = status ? messages[status] : null;

  if (!message) {
    return null;
  }

  return <p className="mb-6 text-sm text-[#555555]">{message}</p>;
}
