export const VOICE_SCRIPTS = [
  {
    id: 'script1',
    title: 'Welcome Message',
    text: "Hello! I'm excited to be speaking with you today. This is a demonstration of my AI-generated voice, created using ElevenLabs technology. I hope you find this experience engaging and natural."
  },
  {
    id: 'script2',
    title: 'Story Time',
    text: "Once upon a time, in a world not so different from our own, there lived a curious mind that dreamed of creating voices that could touch hearts and inspire minds. Through the magic of technology, that dream became a reality."
  },
  {
    id: 'script3',
    title: 'Technical Overview',
    text: "This voice was created using advanced AI technology from ElevenLabs. The system analyzes voice samples to understand unique characteristics like tone, pitch, and speaking style, then generates new speech that maintains these qualities while delivering any message."
  }
] as const;

export type ScriptId = typeof VOICE_SCRIPTS[number]['id']; 