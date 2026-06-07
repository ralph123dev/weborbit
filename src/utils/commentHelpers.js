/**
 * Helpers for threaded comments (max 2 visual levels, Facebook-style).
 */

export function buildCommentMap(comments) {
  return Object.fromEntries(comments.map((c) => [c.id, c]));
}

export function getCommentDepth(comment, commentMap) {
  let depth = 0;
  let current = comment;

  while (current.parent_id && commentMap[current.parent_id]) {
    depth += 1;
    current = commentMap[current.parent_id];
    if (depth >= 2) break;
  }

  return Math.min(depth, 2);
}

export function getQuotedAuthor(comment, commentMap) {
  if (!comment.parent_id) return null;
  const parent = commentMap[comment.parent_id];
  if (!parent?.profiles) return null;

  const name = [parent.profiles.first_name, parent.profiles.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || parent.profiles.username || 'Utilisateur';
}

/** When replying to a nested comment, attach to its parent (flat thread). */
export function getEffectiveParentId(replyTarget, commentMap) {
  if (!replyTarget) return null;
  if (!replyTarget.parent_id) return replyTarget.id;

  const parent = commentMap[replyTarget.parent_id];
  if (!parent || !parent.parent_id) return replyTarget.id;

  return replyTarget.parent_id;
}

export function canReplyTo(comment, commentMap) {
  return getCommentDepth(comment, commentMap) < 2;
}
