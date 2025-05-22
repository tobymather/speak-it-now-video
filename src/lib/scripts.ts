export const VOICE_SCRIPTS = [
  {
    id: 'script1',
    title: 'After 10 lessons: CEFR Pre-A1',
    text: "Hello mum! My name is {child_name}! I am {age} years old. I like football and singing. I go to the park and play football with my friends."
  },
  {
    id: 'script2',
    title: 'After 50 lessons: CEFR A1',
    text: "Hello mum! It's me, {child_name}. I love playing football with my friends. Yesterday, I played football and volleyball for 2 hours."
  },
  {
    id: 'script3',
    title: 'After 100 lessons: CEFR A2',
    text: "Hello mum! It's me, {child_name}. I am getting better at English, and my football is also getting better. Did you know that I love volleyball too? When I'm older, I want to become an English teacher, or a professional football player. Thank you for giving me English lessons to help me with my dream!"
  }
] as const;

export type ScriptId = typeof VOICE_SCRIPTS[number]['id']; 