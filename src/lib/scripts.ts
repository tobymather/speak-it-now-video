export const VOICE_SCRIPTS = [
  {
    id: 'script3',
    title: 'After 100 lessons: CEFR A1',
    text: "Hi mum! It's me, {child_name}, and I love speaking English!... I love {favourite_food}, but I don't like broccoli... At school, I have a new friend and a lot of homework...  When I'm bigger, I want to play {favourite_sport} or become a teacher!"
  },
] as const;

export type ScriptId = typeof VOICE_SCRIPTS[number]['id']; 