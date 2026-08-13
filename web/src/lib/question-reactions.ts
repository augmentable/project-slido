export const QUESTION_REACTION_IDS = ['thumbsup', 'heart', 'laugh', 'think', 'clap'] as const;

export type QuestionReactionId = (typeof QUESTION_REACTION_IDS)[number];

export const QUESTION_REACTIONS: { id: QuestionReactionId; emoji: string; label: string }[] = [
  { id: 'thumbsup', emoji: '👍', label: 'Thumbs up' },
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'think', emoji: '🤔', label: 'Thinking' },
  { id: 'clap', emoji: '👏', label: 'Applause' },
];

export function isQuestionReactionId(id: string): id is QuestionReactionId {
  return (QUESTION_REACTION_IDS as readonly string[]).includes(id);
}
