export interface EmojiCategory {
  id: string;
  labelKey: string;
  icon: string;
}

export interface EmojiItem {
  char: string;
  name: string;
  nameEs: string;
  category: string;
  keywords: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  { id: 'recent', labelKey: 'emoji.categories.recent', icon: 'Clock' },
  { id: 'smileys', labelKey: 'emoji.categories.smileys', icon: 'Smile' },
  { id: 'gestures', labelKey: 'emoji.categories.gestures', icon: 'ThumbsUp' },
  { id: 'work', labelKey: 'emoji.categories.work', icon: 'Laptop' },
  { id: 'symbols', labelKey: 'emoji.categories.symbols', icon: 'Sparkles' },
  { id: 'arrows', labelKey: 'emoji.categories.arrows', icon: 'ArrowRight' },
];

export const EMOJI_LIST: EmojiItem[] = [
  // --- SMILEYS & EMOTION ---
  { char: '😀', name: 'Grinning Face', nameEs: 'Cara sonriente', category: 'smileys', keywords: ['smile', 'happy', 'feliz', 'risa', 'alegria', 'sonrisa'] },
  { char: '😃', name: 'Grinning Face with Big Eyes', nameEs: 'Cara muy sonriente', category: 'smileys', keywords: ['happy', 'joy', 'feliz', 'alegre', 'contento'] },
  { char: '😄', name: 'Grinning Face with Smiling Eyes', nameEs: 'Sonrisa con ojos alegres', category: 'smileys', keywords: ['happy', 'laugh', 'risa', 'feliz'] },
  { char: '😁', name: 'Beaming Face with Smiling Eyes', nameEs: 'Cara radiante con sonrisa', category: 'smileys', keywords: ['teeth', 'dientes', 'risa', 'grin'] },
  { char: '😆', name: 'Grinning Squinting Face', nameEs: 'Risa con ojos cerrados', category: 'smileys', keywords: ['laugh', 'lol', 'jajaja', 'risa', 'divertido'] },
  { char: '😅', name: 'Grinning Face with Sweat', nameEs: 'Sonrisa con sudor frío', category: 'smileys', keywords: ['sweat', 'relief', 'alivio', 'nervios', 'sudor'] },
  { char: '🤣', name: 'Rolling on the Floor Laughing', nameEs: 'Muriendo de risa', category: 'smileys', keywords: ['rofl', 'lmao', 'lol', 'risa', 'jaja', 'carcajada'] },
  { char: '😂', name: 'Face with Tears of Joy', nameEs: 'Llorando de risa', category: 'smileys', keywords: ['tears', 'crying', 'llorar', 'lagrimas', 'risa', 'lol'] },
  { char: '🙂', name: 'Slightly Smiling Face', nameEs: 'Cara ligeramente sonriente', category: 'smileys', keywords: ['smile', 'ok', 'sonrisa', 'amable'] },
  { char: '🙃', name: 'Upside-Down Face', nameEs: 'Cara al revés', category: 'smileys', keywords: ['silly', 'sarcasm', 'ironia', 'locura', 'broma'] },
  { char: '😉', name: 'Winking Face', nameEs: 'Cara guiñando un ojo', category: 'smileys', keywords: ['wink', 'guino', 'broma', 'flirt', 'complice'] },
  { char: '😊', name: 'Smiling Face with Smiling Eyes', nameEs: 'Cara sonriente y sonrojada', category: 'smileys', keywords: ['blush', 'tierno', 'timido', 'gracias'] },
  { char: '😇', name: 'Smiling Face with Halo', nameEs: 'Cara sonriente con aureola', category: 'smileys', keywords: ['angel', 'inocente', 'santo', 'pure', 'halo'] },
  { char: '🥰', name: 'Smiling Face with Hearts', nameEs: 'Cara sonriente con corazones', category: 'smileys', keywords: ['love', 'amor', 'enamorado', 'carino', 'hearts'] },
  { char: '😍', name: 'Smiling Face with Heart-Eyes', nameEs: 'Cara con ojos de corazón', category: 'smileys', keywords: ['love', 'amor', 'adorar', 'encanta', 'hearteyes'] },
  { char: '🤩', name: 'Star-Struck', nameEs: 'Fascinado / Ojos de estrella', category: 'smileys', keywords: ['star', 'estrellas', 'wow', 'fascinado', 'genial'] },
  { char: '😘', name: 'Face Blowing a Kiss', nameEs: 'Cara lanzando un beso', category: 'smileys', keywords: ['kiss', 'beso', 'amor', 'cariño'] },
  { char: '😋', name: 'Face Savoring Food', nameEs: 'Saboreando comida deliciosa', category: 'smileys', keywords: ['yum', 'delicious', 'rico', 'comida', 'delicioso'] },
  { char: '😛', name: 'Face with Tongue', nameEs: 'Cara sacando la lengua', category: 'smileys', keywords: ['tongue', 'lengua', 'broma', 'juego'] },
  { char: '😜', name: 'Winking Face with Tongue', nameEs: 'Guiño sacando la lengua', category: 'smileys', keywords: ['party', 'crazy', 'broma', 'loco', 'fiesta'] },
  { char: '🤪', name: 'Zany Face', nameEs: 'Cara chiflada', category: 'smileys', keywords: ['crazy', 'goofy', 'loco', 'chiflado'] },
  { char: '🤗', name: 'Smiling Face with Open Hands', nameEs: 'Cara sonriente con manos abiertas (Abrazo)', category: 'smileys', keywords: ['hug', 'abrazo', 'cálido', 'bienvenido'] },
  { char: '🙈', name: 'See-No-Evil Monkey', nameEs: 'Mono tapándose los ojos', category: 'smileys', keywords: ['monkey', 'mono', 'verguenza', 'curioso', 'ojos', 'tapar'] },
  { char: '🤔', name: 'Thinking Face', nameEs: 'Cara pensativa', category: 'smileys', keywords: ['think', 'pensar', 'duda', 'interrogante', 'idea'] },
  { char: '🙋', name: 'Person Raising Hand', nameEs: 'Persona levantando la mano', category: 'smileys', keywords: ['salute', 'yo', 'pregunta', 'atencion', 'aqui'] },
  { char: '🤨', name: 'Face with Raised Eyebrow', nameEs: 'Cara con ceja levantada', category: 'smileys', keywords: ['skeptical', 'duda', 'sospecha', 'incredulo'] },
  { char: '😐', name: 'Neutral Face', nameEs: 'Cara neutral', category: 'smileys', keywords: ['neutral', 'serio', 'sin comentarios', 'poker'] },
  { char: '😑', name: 'Expressionless Face', nameEs: 'Cara inexpresiva', category: 'smileys', keywords: ['meh', 'aburrido', 'inexpresivo'] },
  { char: '😶', name: 'Face Without Mouth', nameEs: 'Cara sin boca', category: 'smileys', keywords: ['silence', 'silencio', 'mudo', 'callado'] },
  { char: '🙄', name: 'Face with Rolling Eyes', nameEs: 'Ojos en blanco', category: 'smileys', keywords: ['eyeroll', 'fastidio', 'aburrimiento', 'molestia'] },
  { char: '😏', name: 'Smirking Face', nameEs: 'Cara con sonrisa pícara', category: 'smileys', keywords: ['smirk', 'picaro', 'coqueto', 'ironico'] },
  { char: '😣', name: 'Persevering Face', nameEs: 'Cara de perseverancia o esfuerzo', category: 'smileys', keywords: ['struggle', 'esfuerzo', 'dificil'] },
  { char: '😥', name: 'Sad but Relieved Face', nameEs: 'Cara triste pero aliviada', category: 'smileys', keywords: ['relieved', 'alivio', 'uf', 'casi'] },
  { char: '😮', name: 'Face with Open Mouth', nameEs: 'Cara con boca abierta', category: 'smileys', keywords: ['surprise', 'sorpresa', 'wow', 'asombro'] },
  { char: '🤐', name: 'Zipper-Mouth Face', nameEs: 'Cara con cremallera en la boca', category: 'smileys', keywords: ['secret', 'secreto', 'silencio', 'cerrado'] },
  { char: '😯', name: 'Hushed Face', nameEs: 'Cara atónita', category: 'smileys', keywords: ['surprised', 'atonito', 'mudo'] },
  { char: '😪', name: 'Sleepy Face', nameEs: 'Cara somnolienta', category: 'smileys', keywords: ['tired', 'sleep', 'sueno', 'cansado'] },
  { char: '😫', name: 'Tired Face', nameEs: 'Cara de cansancio', category: 'smileys', keywords: ['exhausted', 'cansado', 'harto'] },
  { char: '🥱', name: 'Yawning Face', nameEs: 'Cara bostezando', category: 'smileys', keywords: ['yawn', 'bostezo', 'aburrido', 'sueno'] },
  { char: '😴', name: 'Sleeping Face', nameEs: 'Cara durmiendo', category: 'smileys', keywords: ['zzz', 'dormido', 'buenas noches', 'sueno'] },
  { char: '😌', name: 'Relieved Face', nameEs: 'Cara de alivio / paz', category: 'smileys', keywords: ['peace', 'tranquilo', 'paz', 'zen', 'alivio'] },
  { char: '🤤', name: 'Drooling Face', nameEs: 'Cara babeando', category: 'smileys', keywords: ['drool', 'deseo', 'antojo', 'rico'] },
  { char: '😷', name: 'Face with Medical Mask', nameEs: 'Cara con mascarilla médica', category: 'smileys', keywords: ['mask', 'mascarilla', 'enfermo', 'virus'] },
  { char: '🤒', name: 'Face with Thermometer', nameEs: 'Cara con termómetro', category: 'smileys', keywords: ['sick', 'fiebre', 'enfermo'] },
  { char: '🤕', name: 'Face with Head-Bandage', nameEs: 'Cara vendada', category: 'smileys', keywords: ['hurt', 'herido', 'golpe', 'accidente'] },
  { char: '🤢', name: 'Nauseated Face', nameEs: 'Cara de náuseas', category: 'smileys', keywords: ['disgust', 'asco', 'vomito', 'verde'] },
  { char: '🤮', name: 'Face Vomiting', nameEs: 'Cara vomitando', category: 'smileys', keywords: ['vomit', 'asco', 'vomitar', 'enfermo'] },
  { char: '🥵', name: 'Hot Face', nameEs: 'Cara acalorada', category: 'smileys', keywords: ['hot', 'calor', 'sofocado', 'verano', 'ardiendo'] },
  { char: '🥶', name: 'Cold Face', nameEs: 'Cara congelada', category: 'smileys', keywords: ['cold', 'frio', 'helado', 'congelado', 'invierno'] },
  { char: '🥴', name: 'Woozy Face', nameEs: 'Cara mareada / achispada', category: 'smileys', keywords: ['drunk', 'dizzy', 'mareado', 'fiesta'] },
  { char: '😵', name: 'Face with Crossed-Out Eyes', nameEs: 'Cara aturdida / K.O.', category: 'smileys', keywords: ['dead', 'ko', 'aturdido', 'muerto'] },
  { char: '🤯', name: 'Exploding Head', nameEs: 'Cabeza explotando', category: 'smileys', keywords: ['mindblown', 'impacto', 'increible', 'explosion', 'boom'] },
  { char: '🥳', name: 'Partying Face', nameEs: 'Cara de fiesta y celebración', category: 'smileys', keywords: ['party', 'celebrate', 'fiesta', 'cumpleanos', 'felicidades'] },
  { char: '😎', name: 'Smiling Face with Sunglasses', nameEs: 'Cara sonriente con gafas de sol', category: 'smileys', keywords: ['cool', 'pro', 'genial', 'gafas', 'sol', 'style'] },
  { char: '🤓', name: 'Nerd Face', nameEs: 'Cara de nerd / empollón', category: 'smileys', keywords: ['nerd', 'geek', 'estudio', 'programador', 'codigo', 'gafas'] },
  { char: '🧐', name: 'Face with Monocle', nameEs: 'Cara con monóculo', category: 'smileys', keywords: ['investigate', 'examinar', 'curioso', 'interesante'] },
  { char: '😕', name: 'Confused Face', nameEs: 'Cara confundida', category: 'smileys', keywords: ['confused', 'confuso', 'desorientado'] },
  { char: '😟', name: 'Worried Face', nameEs: 'Cara preocupada', category: 'smileys', keywords: ['worried', 'preocupado', 'angustia'] },
  { char: '🙁', name: 'Slightly Frowning Face', nameEs: 'Cara ligeramente triste', category: 'smileys', keywords: ['sad', 'triste', 'decepcion'] },
  { char: '🤧', name: 'Sneezing Face', nameEs: 'Cara estornudando', category: 'smileys', keywords: ['sneeze', 'estornudo', 'resfriado', 'salud', 'panuelo'] },
  { char: '😨', name: 'Fearful Face', nameEs: 'Cara asustada', category: 'smileys', keywords: ['fear', 'miedo', 'asustado'] },
  { char: '😰', name: 'Anxious Face with Sweat', nameEs: 'Cara ansiosa con sudor', category: 'smileys', keywords: ['anxious', 'ansiedad', 'nervioso', 'estres'] },
  { char: '😢', name: 'Crying Face', nameEs: 'Cara llorando', category: 'smileys', keywords: ['tear', 'sad', 'triste', 'lagrima'] },
  { char: '😭', name: 'Loudly Crying Face', nameEs: 'Llorando a gritos', category: 'smileys', keywords: ['crying', 'sob', 'llorar', 'tristeza', 'desconsolado'] },
  { char: '😱', name: 'Face Screaming in Fear', nameEs: 'Cara gritando de miedo / pánico', category: 'smileys', keywords: ['scream', 'shock', 'grito', 'panico', 'asombro'] },
  { char: '😤', name: 'Face with Steam From Nose', nameEs: 'Cara con vapor en la nariz', category: 'smileys', keywords: ['triumph', 'proud', 'orgullo', 'determinado', 'furia'] },
  { char: '😡', name: 'Enraged Face', nameEs: 'Cara furiosa', category: 'smileys', keywords: ['angry', 'furious', 'enojado', 'furia', 'rabia', 'rojo'] },
  { char: '😠', name: 'Angry Face', nameEs: 'Cara enfadada', category: 'smileys', keywords: ['mad', 'enfadado', 'molesto'] },
  { char: '🤬', name: 'Face with Symbols on Mouth', nameEs: 'Cara diciendo palabrotas', category: 'smileys', keywords: ['curse', 'swear', 'rabia', 'insulto', 'bronca'] },
  { char: '💀', name: 'Skull', nameEs: 'Calavera', category: 'smileys', keywords: ['dead', 'muerto', 'rip', 'risa', 'calavera'] },
  { char: '☠️', name: 'Skull and Crossbones', nameEs: 'Calavera con tibias cruzadas', category: 'smileys', keywords: ['danger', 'peligro', 'veneno', 'pirata'] },
  { char: '💩', name: 'Pile of Poo', nameEs: 'Caca con ojos', category: 'smileys', keywords: ['poop', 'mierda', 'caca', 'broma'] },
  { char: '🤡', name: 'Clown Face', nameEs: 'Cara de payaso', category: 'smileys', keywords: ['clown', 'payaso', 'broma', 'ridiculo'] },
  { char: '👻', name: 'Ghost', nameEs: 'Fantasma', category: 'smileys', keywords: ['ghost', 'fantasma', 'espiritu', 'halloween'] },
  { char: '👽', name: 'Alien', nameEs: 'Extraterrestre', category: 'smileys', keywords: ['alien', 'extraterrestre', 'ovni', 'space'] },
  { char: '🤖', name: 'Robot', nameEs: 'Robot', category: 'smileys', keywords: ['bot', 'robot', 'ai', 'ia', 'tecnologia'] },
  { char: '🎃', name: 'Jack-O-Lantern', nameEs: 'Calabaza de Halloween', category: 'smileys', keywords: ['pumpkin', 'halloween', 'calabaza'] },

  // --- GESTURES & PEOPLE ---
  { char: '👍', name: 'Thumbs Up', nameEs: 'Pulgar arriba / Me gusta', category: 'gestures', keywords: ['like', 'ok', 'yes', 'si', 'aprobado', 'bien', 'bueno'] },
  { char: '👎', name: 'Thumbs Down', nameEs: 'Pulgar abajo / No me gusta', category: 'gestures', keywords: ['dislike', 'no', 'mal', 'desaprobado'] },
  { char: '👊', name: 'Oncoming Fist', nameEs: 'Puñetazo de frente', category: 'gestures', keywords: ['fist', 'bump', 'choque', 'golpe', 'amigo'] },
  { char: '✊', name: 'Raised Fist', nameEs: 'Puño levantado', category: 'gestures', keywords: ['power', 'fuerza', 'resistencia', 'victoria'] },
  { char: '🤛', name: 'Left-Facing Fist', nameEs: 'Puño a la izquierda', category: 'gestures', keywords: ['fistbump', 'saludo', 'amigo'] },
  { char: '🤜', name: 'Right-Facing Fist', nameEs: 'Puño a la derecha', category: 'gestures', keywords: ['fistbump', 'saludo', 'amigo'] },
  { char: '👏', name: 'Clapping Hands', nameEs: 'Manos aplaudiendo', category: 'gestures', keywords: ['applause', 'aplauso', 'bravo', 'felicitaciones'] },
  { char: '🙌', name: 'Raising Hands', nameEs: 'Manos levantadas celebrando', category: 'gestures', keywords: ['celebration', 'celebrar', 'alabanza', 'hurra'] },
  { char: '👐', name: 'Open Hands', nameEs: 'Manos abiertas', category: 'gestures', keywords: ['open', 'abierto', 'abrazo'] },
  { char: '🤲', name: 'Palms Up Together', nameEs: 'Palmas hacia arriba', category: 'gestures', keywords: ['prayer', 'oracion', 'pedir', 'gracias'] },
  { char: '🤝', name: 'Handshake', nameEs: 'Apretón de manos', category: 'gestures', keywords: ['deal', 'trato', 'acuerdo', 'alianza', 'hola'] },
  { char: '🙏', name: 'Folded Hands', nameEs: 'Manos rezando / Por favor / Gracias', category: 'gestures', keywords: ['please', 'thanks', 'gracias', 'porfavor', 'rezo', 'namaste'] },
  { char: '✍️', name: 'Writing Hand', nameEs: 'Mano escribiendo', category: 'gestures', keywords: ['write', 'escribir', 'nota', 'firma', 'autor'] },
  { char: '💅', name: 'Nail Polish', nameEs: 'Esmalte de uñas', category: 'gestures', keywords: ['slay', 'unas', 'estilo', 'diva', 'relax'] },
  { char: '🤳', name: 'Selfie', nameEs: 'Selfi', category: 'gestures', keywords: ['selfie', 'foto', 'camara', 'movil'] },
  { char: '💪', name: 'Flexed Biceps', nameEs: 'Bíceps flexionado', category: 'gestures', keywords: ['strong', 'fuerte', 'fuerza', 'gym', 'musculo', 'poder'] },
  { char: '👈', name: 'Backhand Index Pointing Left', nameEs: 'Índice señalando a la izquierda', category: 'gestures', keywords: ['point', 'left', 'izquierda', 'apuntar'] },
  { char: '👉', name: 'Backhand Index Pointing Right', nameEs: 'Índice señalando a la derecha', category: 'gestures', keywords: ['point', 'right', 'derecha', 'apuntar'] },
  { char: '👆', name: 'Backhand Index Pointing Up', nameEs: 'Índice señalando arriba', category: 'gestures', keywords: ['point', 'up', 'arriba', 'mirar'] },
  { char: '👇', name: 'Backhand Index Pointing Down', nameEs: 'Índice señalando abajo', category: 'gestures', keywords: ['point', 'down', 'abajo', 'aqui', 'link'] },
  { char: '☝️', name: 'Index Pointing Up', nameEs: 'Dedo índice arriba', category: 'gestures', keywords: ['one', 'primero', 'atencion', 'pregunta'] },
  { char: '✋', name: 'Raised Hand', nameEs: 'Mano levantada / Alto', category: 'gestures', keywords: ['stop', 'alto', 'mano', 'parar', 'saludo'] },
  { char: '🤚', name: 'Raised Back of Hand', nameEs: 'Dorso de mano levantada', category: 'gestures', keywords: ['hand', 'mano', 'espera'] },
  { char: '🖐️', name: 'Hand with Fingers Splayed', nameEs: 'Mano abierta con dedos extendidos', category: 'gestures', keywords: ['five', 'cinco', 'saludo'] },
  { char: '🖖', name: 'Vulcan Salute', nameEs: 'Saludo vulcano', category: 'gestures', keywords: ['spock', 'vulcan', 'saludo', 'paz', 'prosperidad'] },
  { char: '👋', name: 'Waving Hand', nameEs: 'Mano saludando', category: 'gestures', keywords: ['wave', 'hello', 'bye', 'hola', 'adios', 'saludo'] },
  { char: '🤙', name: 'Call Me Hand', nameEs: 'Gesto de llamar / Shaka', category: 'gestures', keywords: ['call', 'llamame', 'shaka', 'surfer', 'tranquilo'] },
  { char: '🙆', name: 'Person Gesturing OK', nameEs: 'Persona haciendo señal de OK', category: 'gestures', keywords: ['ok', 'bien', 'perfecto'] },
  { char: '🤏', name: 'Pinching Hand', nameEs: 'Mano pellizcando / Un poquito', category: 'gestures', keywords: ['pinch', 'poquito', 'pequeno', 'tiny'] },
  { char: '✌️', name: 'Victory Hand', nameEs: 'Mano de victoria o paz', category: 'gestures', keywords: ['peace', 'victory', 'paz', 'victoria', 'dos'] },
  { char: '🤞', name: 'Crossed Fingers', nameEs: 'Dedos cruzados (Suerte)', category: 'gestures', keywords: ['luck', 'suerte', 'esperanza', 'ojala'] },
  { char: '🙅', name: 'Person Gesturing NO', nameEs: 'Persona haciendo señal de NO', category: 'gestures', keywords: ['no', 'alto', 'prohibido'] },
  { char: '🤟', name: 'Love-You Gesture', nameEs: 'Gesto de te quiero', category: 'gestures', keywords: ['love', 'tequiero', 'amor'] },
  { char: '🤘', name: 'Sign of the Horns', nameEs: 'Signo de cuernos (Rock)', category: 'gestures', keywords: ['rock', 'metal', 'musica', 'fiesta'] },
  { char: '👌', name: 'OK Hand', nameEs: 'Mano con señal de OK', category: 'gestures', keywords: ['ok', 'perfecto', 'bien', 'vale', 'listo'] },
  { char: '🙇', name: 'Person Bowing', nameEs: 'Persona haciendo reverencia', category: 'gestures', keywords: ['bow', 'gracias', 'disculpa', 'respeto'] },
  { char: '👀', name: 'Eyes', nameEs: 'Ojos curiosos', category: 'gestures', keywords: ['look', 'mirar', 'ojo', 'atencion', 'observar', 'curioso'] },
  { char: '👁️', name: 'Eye', nameEs: 'Ojo', category: 'gestures', keywords: ['eye', 'ojo', 'vision', 'mirar'] },
  { char: '🧠', name: 'Brain', nameEs: 'Cerebro', category: 'gestures', keywords: ['brain', 'cerebro', 'inteligencia', 'mente', 'pensar'] },

  // --- WORK & TECH ---
  { char: '💻', name: 'Laptop', nameEs: 'Portátil / Laptop', category: 'work', keywords: ['computer', 'pc', 'ordenador', 'codigo', 'trabajo'] },
  { char: '🖥️', name: 'Desktop Computer', nameEs: 'Ordenador de sobremesa', category: 'work', keywords: ['desktop', 'pantalla', 'monitor', 'pc'] },
  { char: '📱', name: 'Mobile Phone', nameEs: 'Teléfono móvil / Smartphone', category: 'work', keywords: ['phone', 'movil', 'celular', 'smartphone'] },
  { char: '⌨️', name: 'Keyboard', nameEs: 'Teclado', category: 'work', keywords: ['keyboard', 'teclado', 'escribir', 'mecanografia'] },
  { char: '🖱️', name: 'Computer Mouse', nameEs: 'Ratón de ordenador', category: 'work', keywords: ['mouse', 'raton', 'click'] },
  { char: '🖨️', name: 'Printer', nameEs: 'Impresora', category: 'work', keywords: ['print', 'impresora', 'imprimir', 'papel'] },
  { char: '💾', name: 'Floppy Disk', nameEs: 'Disquete (Guardar)', category: 'work', keywords: ['save', 'guardar', 'disk', 'disco'] },
  { char: '📁', name: 'File Folder', nameEs: 'Carpeta de archivos', category: 'work', keywords: ['folder', 'carpeta', 'directorio'] },
  { char: '📂', name: 'Open File Folder', nameEs: 'Carpeta abierta', category: 'work', keywords: ['open', 'abrir', 'carpeta'] },
  { char: '📄', name: 'Page Facing Up', nameEs: 'Página de documento', category: 'work', keywords: ['document', 'documento', 'hoja', 'texto'] },
  { char: '📊', name: 'Bar Chart', nameEs: 'Gráfico de barras', category: 'work', keywords: ['chart', 'grafico', 'estadistica', 'metricas'] },
  { char: '📈', name: 'Chart Increasing', nameEs: 'Gráfico con tendencia al alza', category: 'work', keywords: ['growth', 'crecimiento', 'exito', 'subida', 'profit'] },
  { char: '📉', name: 'Chart Decreasing', nameEs: 'Gráfico con tendencia a la baja', category: 'work', keywords: ['loss', 'bajada', 'caida', 'perdida'] },
  { char: '📋', name: 'Clipboard', nameEs: 'Portapapeles', category: 'work', keywords: ['clipboard', 'portapapeles', 'paste', 'pegar', 'cyberpaste'] },
  { char: '📌', name: 'Pushpin', nameEs: 'Chincheta / Fijar', category: 'work', keywords: ['pin', 'fijar', 'anclar', 'chincheta', 'recordar'] },
  { char: '📍', name: 'Round Pushpin', nameEs: 'Chincheta redonda / Ubicación', category: 'work', keywords: ['location', 'ubicacion', 'mapa', 'lugar'] },
  { char: '📎', name: 'Paperclip', nameEs: 'Clip de papel / Adjunto', category: 'work', keywords: ['attach', 'adjunto', 'clip', 'archivo'] },
  { char: '🔒', name: 'Locked', nameEs: 'Candado cerrado / Seguridad', category: 'work', keywords: ['lock', 'candado', 'seguro', 'privado', 'password'] },
  { char: '🔓', name: 'Unlocked', nameEs: 'Candado abierto', category: 'work', keywords: ['unlock', 'abierto', 'desbloqueado'] },
  { char: '🔑', name: 'Key', nameEs: 'Llave', category: 'work', keywords: ['key', 'llave', 'acceso', 'clave', 'token'] },
  { char: '⚙️', name: 'Gear', nameEs: 'Engranaje / Configuración', category: 'work', keywords: ['settings', 'config', 'ajustes', 'engranaje', 'opciones'] },
  { char: '🔧', name: 'Wrench', nameEs: 'Llave inglesa / Herramientas', category: 'work', keywords: ['tool', 'reparar', 'herramienta', 'fix'] },
  { char: '🔨', name: 'Hammer', nameEs: 'Martillo', category: 'work', keywords: ['build', 'construir', 'martillo'] },
  { char: '💡', name: 'Light Bulb', nameEs: 'Bombilla / Idea', category: 'work', keywords: ['idea', 'luz', 'inspiracion', 'solucion'] },
  { char: '🚀', name: 'Rocket', nameEs: 'Cohete / Lanzamiento', category: 'work', keywords: ['rocket', 'launch', 'lanzar', 'cohete', 'despegue', 'rapido'] },
  { char: '⚡', name: 'High Voltage', nameEs: 'Rayo / Energía / Rápido', category: 'work', keywords: ['lightning', 'rayo', 'energia', 'rapido', 'power', 'fast'] },
  { char: '🔥', name: 'Fire', nameEs: 'Fuego / Trending / Hot', category: 'work', keywords: ['fire', 'fuego', 'hot', 'popular', 'llama', 'ardiente'] },
  { char: '🔋', name: 'Battery', nameEs: 'Batería', category: 'work', keywords: ['battery', 'bateria', 'carga', 'energia'] },
  { char: '🔌', name: 'Electric Plug', nameEs: 'Enchufe eléctrico', category: 'work', keywords: ['plug', 'enchufe', 'conectar', 'plugin'] },

  // --- SYMBOLS & ALERTS ---
  { char: '✅', name: 'Check Mark Button', nameEs: 'Marca de verificación verde (Check)', category: 'symbols', keywords: ['check', 'ok', 'yes', 'aprobado', 'listo', 'correcto', 'verde', 'done'] },
  { char: '✔️', name: 'Check Mark', nameEs: 'Marca de verificación', category: 'symbols', keywords: ['check', 'correcto', 'verificado', 'listo'] },
  { char: '❌', name: 'Cross Mark', nameEs: 'Cruz roja (Error / Cancelar)', category: 'symbols', keywords: ['cross', 'no', 'error', 'cancelar', 'falso', 'rechazado'] },
  { char: '✖️', name: 'Multiply', nameEs: 'Multiplicación / Cruz', category: 'symbols', keywords: ['multiply', 'cancel'] },
  { char: '➕', name: 'Plus', nameEs: 'Signo más', category: 'symbols', keywords: ['plus', 'mas', 'anadir', 'sumar'] },
  { char: '➖', name: 'Minus', nameEs: 'Signo menos', category: 'symbols', keywords: ['minus', 'menos', 'restar'] },
  { char: '⚠️', name: 'Warning', nameEs: 'Advertencia / Peligro', category: 'symbols', keywords: ['warning', 'alerta', 'cuidado', 'aviso', 'peligro'] },
  { char: '🚫', name: 'Prohibited', nameEs: 'Prohibido', category: 'symbols', keywords: ['no', 'prohibido', 'bloqueado', 'stop'] },
  { char: '⛔', name: 'No Entry', nameEs: 'Dirección prohibida', category: 'symbols', keywords: ['stop', 'prohibido', 'alto'] },
  { char: '🛑', name: 'Stop Sign', nameEs: 'Señal de STOP', category: 'symbols', keywords: ['stop', 'parar', 'alto'] },
  { char: '🔔', name: 'Bell', nameEs: 'Campana / Notificación', category: 'symbols', keywords: ['bell', 'campana', 'notificacion', 'alerta'] },
  { char: '🔕', name: 'Bell with Slash', nameEs: 'Campana silenciada', category: 'symbols', keywords: ['mute', 'silencio', 'sin notificaciones'] },
  { char: '💯', name: 'Hundred Points', nameEs: 'Cien puntos / Perfecto', category: 'symbols', keywords: ['100', 'perfect', 'cien', 'perfecto', 'top'] },
  { char: '⭐', name: 'Star', nameEs: 'Estrella dorada / Favorito', category: 'symbols', keywords: ['star', 'estrella', 'favorito', 'destacado'] },
  { char: '🌟', name: 'Glowing Star', nameEs: 'Estrella brillante', category: 'symbols', keywords: ['sparkle', 'estrella', 'brillo', 'especial'] },
  { char: '✨', name: 'Sparkles', nameEs: 'Chispas / Novedad / AI', category: 'symbols', keywords: ['sparkles', 'magia', 'nuevo', 'ai', 'chispas', 'limpio'] },
  { char: '🎯', name: 'Bullseye', nameEs: 'Diana / Objetivo', category: 'symbols', keywords: ['target', 'objetivo', 'meta', 'diana', 'focus'] },
  { char: '🏆', name: 'Trophy', nameEs: 'Trofeo / Ganador', category: 'symbols', keywords: ['trophy', 'trofeo', 'premio', 'ganador', 'campeon'] },
  { char: '🥇', name: '1st Place Medal', nameEs: 'Medalla de oro (1º puesto)', category: 'symbols', keywords: ['gold', 'primero', 'oro', '1'] },
  { char: '🥈', name: '2nd Place Medal', nameEs: 'Medalla de plata (2º puesto)', category: 'symbols', keywords: ['silver', 'segundo', 'plata', '2'] },
  { char: '🥉', name: '3rd Place Medal', nameEs: 'Medalla de bronce (3º puesto)', category: 'symbols', keywords: ['bronze', 'tercero', 'bronce', '3'] },
  { char: '💬', name: 'Speech Balloon', nameEs: 'Bocadillo de diálogo', category: 'symbols', keywords: ['chat', 'mensaje', 'comentario', 'hablar'] },
  { char: '💭', name: 'Thought Balloon', nameEs: 'Bocadillo de pensamiento', category: 'symbols', keywords: ['thought', 'pensamiento', 'idea'] },
  { char: '❤️', name: 'Red Heart', nameEs: 'Corazón rojo', category: 'symbols', keywords: ['love', 'corazon', 'amor', 'like'] },
  { char: '💙', name: 'Blue Heart', nameEs: 'Corazón azul', category: 'symbols', keywords: ['blue', 'corazon', 'azul'] },
  { char: '💚', name: 'Green Heart', nameEs: 'Corazón verde', category: 'symbols', keywords: ['green', 'corazon', 'verde'] },
  { char: '💛', name: 'Yellow Heart', nameEs: 'Corazón amarillo', category: 'symbols', keywords: ['yellow', 'corazon', 'amarillo'] },
  { char: '💜', name: 'Purple Heart', nameEs: 'Corazón morado', category: 'symbols', keywords: ['purple', 'corazon', 'morado'] },
  { char: '🖤', name: 'Black Heart', nameEs: 'Corazón negro', category: 'symbols', keywords: ['black', 'corazon', 'negro'] },
  { char: '🤍', name: 'White Heart', nameEs: 'Corazón blanco', category: 'symbols', keywords: ['white', 'corazon', 'blanco'] },
  { char: '💔', name: 'Broken Heart', nameEs: 'Corazón roto', category: 'symbols', keywords: ['broken', 'desamor', 'roto', 'triste'] },
  { char: '❓', name: 'Question Mark', nameEs: 'Signo de interrogación rojo', category: 'symbols', keywords: ['question', 'duda', 'pregunta', 'ayuda'] },
  { char: '❔', name: 'White Question Mark', nameEs: 'Signo de interrogación blanco', category: 'symbols', keywords: ['question', 'pregunta'] },
  { char: '❗️', name: 'Exclamation Mark', nameEs: 'Signo de exclamación rojo', category: 'symbols', keywords: ['exclamation', 'atencion', 'importante'] },

  // --- ARROWS & BADGES ---
  { char: '➡️', name: 'Right Arrow', nameEs: 'Flecha hacia la derecha', category: 'arrows', keywords: ['arrow', 'right', 'derecha', 'siguiente'] },
  { char: '⬅️', name: 'Left Arrow', nameEs: 'Flecha hacia la izquierda', category: 'arrows', keywords: ['arrow', 'left', 'izquierda', 'anterior'] },
  { char: '⬆️', name: 'Up Arrow', nameEs: 'Flecha hacia arriba', category: 'arrows', keywords: ['arrow', 'up', 'arriba', 'subir'] },
  { char: '⬇️', name: 'Down Arrow', nameEs: 'Flecha hacia abajo', category: 'arrows', keywords: ['arrow', 'down', 'abajo', 'bajar'] },
  { char: '↗️', name: 'Up-Right Arrow', nameEs: 'Flecha arriba a la derecha', category: 'arrows', keywords: ['arrow', 'diagonal'] },
  { char: '↘️', name: 'Down-Right Arrow', nameEs: 'Flecha abajo a la derecha', category: 'arrows', keywords: ['arrow', 'diagonal'] },
  { char: '🔄', name: 'Counterclockwise Arrows Button', nameEs: 'Flechas giratorias / Recargar', category: 'arrows', keywords: ['refresh', 'recargar', 'actualizar', 'reload', 'sync'] },
  { char: '🔃', name: 'Clockwise Vertical Arrows', nameEs: 'Flechas verticales de recarga', category: 'arrows', keywords: ['reload', 'girar'] },
  { char: '🔁', name: 'Repeat Button', nameEs: 'Botón de repetir', category: 'arrows', keywords: ['repeat', 'repetir', 'bucle'] },
  { char: '▶️', name: 'Play Button', nameEs: 'Botón de reproducir', category: 'arrows', keywords: ['play', 'reproducir', 'iniciar'] },
  { char: '⏸️', name: 'Pause Button', nameEs: 'Botón de pausa', category: 'arrows', keywords: ['pause', 'pausar', 'detener'] },
  { char: '⏹️', name: 'Stop Button', nameEs: 'Botón de parar', category: 'arrows', keywords: ['stop', 'parar'] },
  { char: '🔴', name: 'Red Circle', nameEs: 'Círculo rojo', category: 'arrows', keywords: ['red', 'rojo', 'circulo', 'alerta'] },
  { char: '🟢', name: 'Green Circle', nameEs: 'Círculo verde', category: 'arrows', keywords: ['green', 'verde', 'circulo', 'activo', 'online'] },
  { char: '🟡', name: 'Yellow Circle', nameEs: 'Círculo amarillo', category: 'arrows', keywords: ['yellow', 'amarillo', 'pendiente'] },
  { char: '🔵', name: 'Blue Circle', nameEs: 'Círculo azul', category: 'arrows', keywords: ['blue', 'azul'] },
  { char: '🟣', name: 'Purple Circle', nameEs: 'Círculo morado', category: 'arrows', keywords: ['purple', 'morado'] },
  { char: '⚫', name: 'Black Circle', nameEs: 'Círculo negro', category: 'arrows', keywords: ['black', 'negro'] },
  { char: '⚪', name: 'White Circle', nameEs: 'Círculo blanco', category: 'arrows', keywords: ['white', 'blanco'] },
  { char: '⬛', name: 'Black Large Square', nameEs: 'Cuadrado negro', category: 'arrows', keywords: ['square', 'cuadrado', 'negro'] },
  { char: '⬜', name: 'White Large Square', nameEs: 'Cuadrado blanco', category: 'arrows', keywords: ['square', 'cuadrado', 'blanco'] },
];

const RECENT_KEY = 'cyberpaste_recent_emojis';
const MAX_RECENTS = 28;

export function getRecentEmojis(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) {
      return ['👍', '✅', '🔥', '🚀', '✨', '💡', '❤️', '👀', '⭐', '👏', '🎉', '💯'];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return ['👍', '✅', '🔥', '🚀', '✨', '💡', '❤️', '👀'];
  }
}

export function saveRecentEmoji(char: string): string[] {
  try {
    const current = getRecentEmojis().filter((c) => c !== char);
    const updated = [char, ...current].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('cyberpaste-recent-emojis-changed', { detail: updated }));
    return updated;
  } catch {
    return [char];
  }
}

export function searchEmojis(query: string, category?: string | null): EmojiItem[] {
  const q = query.trim().toLowerCase();
  
  // If there's a search query, search across all emojis regardless of selected category
  if (q) {
    // Strip leading ':' if user typed e.g. ':fire'
    const normalizedQuery = q.startsWith(':') ? q.slice(1) : q;
    if (!normalizedQuery) {
      return EMOJI_LIST;
    }
    return EMOJI_LIST.filter((item) => {
      if (item.char.includes(normalizedQuery)) return true;
      if (item.name.toLowerCase().includes(normalizedQuery)) return true;
      if (item.nameEs.toLowerCase().includes(normalizedQuery)) return true;
      return item.keywords.some((k) => k.toLowerCase().includes(normalizedQuery));
    });
  }

  // If no query and category specified
  if (category && category !== 'all' && category !== 'recent') {
    return EMOJI_LIST.filter((item) => item.category === category);
  }

  return EMOJI_LIST;
}

const RECENT_EMOJI_SEARCHES_KEY = 'cyberpaste-recent-emoji-searches';
const MAX_SEARCH_HISTORY = 10;

export function getRecentEmojiSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_EMOJI_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentEmojiSearch(query: string): string[] {
  const q = query.trim();
  if (!q) return getRecentEmojiSearches();
  try {
    const current = getRecentEmojiSearches().filter((s) => s.toLowerCase() !== q.toLowerCase());
    const updated = [q, ...current].slice(0, MAX_SEARCH_HISTORY);
    localStorage.setItem(RECENT_EMOJI_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [q];
  }
}

export function clearRecentEmojiSearches(): void {
  try {
    localStorage.removeItem(RECENT_EMOJI_SEARCHES_KEY);
  } catch {}
}
