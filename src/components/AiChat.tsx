import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Mic, MicOff } from 'lucide-react';
import './AiChat.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function inlineFormat(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="ai-inline-code">{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^#{1,3}\s/.test(line)) {
      elements.push(<p key={key++} className="ai-md-heading">{inlineFormat(line.replace(/^#+\s/, ''))}</p>);
      i++; continue;
    }
    if (/^[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) { items.push(lines[i].replace(/^[-*•]\s/, '')); i++; }
      elements.push(<ul key={key++} className="ai-md-list">{items.map((item, j) => <li key={j}>{inlineFormat(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, '')); i++; }
      elements.push(<ol key={key++} className="ai-md-list">{items.map((item, j) => <li key={j}>{inlineFormat(item)}</li>)}</ol>);
      continue;
    }
    if (line.trim() === '') { i++; continue; }
    elements.push(<p key={key++}>{inlineFormat(line)}</p>);
    i++;
  }
  return elements;
}

// ── Suggestions ───────────────────────────────────────────────────────────────

const ALL_SUGGESTIONS = [
  // Ventas
  '¿Cuánto vendimos esta semana?',
  '¿Cuánto vendimos este mes?',
  '¿Cuál fue el mejor día de ventas del mes?',
  '¿Cuántas órdenes tenemos este mes?',
  '¿Cuál es el ticket promedio?',
  '¿Cuánto vendimos ayer?',
  'Mostrá las últimas 5 ventas',
  '¿Qué método de pago se usa más?',
  '¿Cuántas órdenes están pendientes de pago?',
  '¿Cuál fue la venta más alta del mes?',
  'Compará las ventas de esta semana con la anterior',
  '¿Cuántas órdenes se cancelaron este mes?',
  '¿A qué hora del día vendemos más?',
  '¿Cuánto facturamos en los últimos 30 días?',
  '¿Cuántas órdenes tenemos hoy?',
  '¿Cuál es el total de ventas de la semana pasada?',
  'Dame un resumen de ventas del mes',
  '¿Cuántos clientes compraron más de una vez este mes?',
  '¿Qué día de la semana vendemos más?',
  '¿Cuánto representan las ventas de hoy vs el promedio diario?',

  // Productos y stock
  '¿Qué productos tienen poco stock?',
  '¿Qué productos se agotaron?',
  '¿Cuáles son los 5 productos más vendidos?',
  '¿Qué producto generó más ingresos este mes?',
  '¿Qué productos no se vendieron nada este mes?',
  '¿Cuántos productos tenemos con stock menor a 5?',
  '¿Qué talle se vende más?',
  '¿Cuál es el producto con mayor margen?',
  'Listá todos los productos sin stock',
  '¿Qué productos vendimos hoy?',
  '¿Cuántas unidades vendimos este mes en total?',
  '¿Qué colores se venden más?',
  '¿Cuáles son los productos más devueltos?',
  '¿Cuál es el producto más caro de la tienda?',
  '¿Qué productos tienen stock pero no se vendieron en 30 días?',

  // Clientes
  '¿Quién es el cliente que más compró este mes?',
  '¿Cuántos clientes nuevos tuvimos esta semana?',
  '¿Quiénes son nuestros 3 mejores clientes?',
  '¿Cuántos clientes compraron por primera vez?',
  '¿Cuántos clientes recurrentes tenemos?',
  '¿Cuál es el cliente con más órdenes?',
  '¿Cuánto gasta en promedio cada cliente?',
  'Dame el top 5 de clientes por monto gastado',
  '¿Cuántos clientes compraron más de dos veces?',
  '¿Hay algún cliente VIP que no compró este mes?',
  '¿Cuántos clientes únicos tuvimos esta semana?',
  '¿Qué ciudad concentra más clientes?',

  // Cupones
  'Creá un cupón BIENVENIDA de 15% de descuento',
  'Creá un cupón VERANO25 de 25% de descuento',
  'Creá un cupón PROMO10 de 10% de descuento',
  'Creá un cupón SALE20 de 20% de descuento',
  'Creá un cupón FINDE30 de 30% de descuento',
  '¿Cuántas veces se usó el último cupón?',
  '¿Qué cupones están activos ahora?',
  '¿Cuánto descuento otorgamos con cupones este mes?',
  '¿Cuál es el cupón más usado?',
  'Creá un cupón ENVIOGRATIS de envío gratis',
  '¿Cuántos pedidos usaron cupón este mes?',

  // Meta Ads
  '¿Cuánto gastamos en Meta Ads esta semana?',
  '¿Cuál es el ROAS de la semana?',
  '¿Qué campaña tiene mejor rendimiento?',
  '¿Cuántos clics tuvimos en los anuncios hoy?',
  '¿Cuál es el costo por clic promedio?',
  '¿Cuántas impresiones tuvimos esta semana?',
  '¿Qué campaña tiene peor CTR?',
  '¿Cuánto gastamos en publicidad este mes?',
  '¿Cuántas conversiones generaron los anuncios?',
  '¿Qué anuncio tiene mejor CTR?',
  '¿Cuál es el costo por conversión?',
  '¿Conviene seguir invirtiendo en la campaña actual?',
  'Compará el gasto de Meta con las ventas generadas',
  '¿Qué campaña pausaría con estos números?',

  // Emails
  '¿Hay emails urgentes sin responder?',
  '¿Cuántos emails de reclamo tenemos sin atender?',
  '¿Hay consultas de clientes pendientes?',
  '¿Qué emails de hoy son más importantes?',
  'Resumí los emails sin leer',
  '¿Hay emails de devolución pendientes?',
  '¿Cuántos emails nuevos llegaron hoy?',
  '¿Hay algún cliente enojado en los emails?',
  'Mostrame los emails marcados como urgente',
  '¿Hay emails positivos para destacar?',

  // Análisis y estrategia
  '¿En qué producto deberíamos invertir más stock?',
  '¿Qué día conviene hacer una promo?',
  'Dame un resumen ejecutivo del negocio',
  '¿Qué tendencias ves en las ventas del mes?',
  '¿Estamos por encima o debajo del mes pasado?',
  '¿Qué categoría de producto vende más?',
  '¿Conviene hacer una promo de liquidación?',
  '¿Qué productos recomendarías reponer primero?',
  'Analizá la performance de esta semana',
  '¿Cuánto necesitamos vender para superar el mes pasado?',
  '¿Qué producto tiene más potencial de crecimiento?',
  'Dame 3 acciones concretas para aumentar ventas',
  '¿Cuál es nuestra tasa de conversión aproximada?',
  '¿Qué hora del día es mejor para publicar en redes?',
  '¿Qué tan dependemos de Meta Ads para vender?',

  // Envíos y operaciones
  '¿Cuántas órdenes están listas para despachar?',
  '¿Hay órdenes con más de 2 días sin enviar?',
  '¿Cuántos envíos hicimos esta semana?',
  '¿Cuál es el costo promedio de envío?',
  '¿Cuántas órdenes tienen envío gratis?',
  '¿Qué porcentaje de ventas usa Andreani?',
  '¿Cuántas órdenes se entregaron esta semana?',

  // Ruleta y promos
  '¿Cuántas personas participaron de la ruleta?',
  '¿Qué premios se otorgaron en la ruleta?',
  '¿Cuántos giros tuvo la ruleta este mes?',
  '¿Cuál es el premio más solicitado de la ruleta?',
];

function getRandomSuggestions(n = 4): string[] {
  const shuffled = [...ALL_SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AiChat() {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError]   = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState(() => getRandomSuggestions());

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const recognitionRef  = useRef<any>(null);
  const charQueueRef    = useRef<string[]>([]);
  const typingTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamDoneRef   = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Detener reconocimiento al cerrar el chat
  useEffect(() => {
    if (!open && isListening) stopListening();
  }, [open]);

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    resizeTextarea(e.target);
  };

  // ── Typewriter ───────────────────────────────────────────────────────────────

  const startTyping = () => {
    if (typingTimerRef.current) return;
    typingTimerRef.current = setInterval(() => {
      const queue = charQueueRef.current;
      if (queue.length === 0) {
        if (streamDoneRef.current) {
          clearInterval(typingTimerRef.current!);
          typingTimerRef.current = null;
          streamDoneRef.current = false;
        }
        return;
      }
      const chars = queue.splice(0, 2).join('');
      setMessages(prev => {
        const msgs = [...prev];
        const last = msgs[msgs.length - 1];
        if (last?.role === 'assistant') {
          msgs[msgs.length - 1] = { ...last, content: last.content + chars };
        }
        return msgs;
      });
    }, 25);
  };

  const stopTyping = () => {
    if (typingTimerRef.current) { clearInterval(typingTimerRef.current); typingTimerRef.current = null; }
    charQueueRef.current = [];
    streamDoneRef.current = false;
  };

  // ── Voice input ─────────────────────────────────────────────────────────────

  const startListening = () => {
    setVoiceError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Tu navegador no soporta voz. Usá Chrome o Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      setInput(prev => {
        const next = prev ? `${prev} ${transcript}` : transcript;
        // resize después del render
        setTimeout(() => {
          if (inputRef.current) resizeTextarea(inputRef.current);
        }, 0);
        return next;
      });
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        setVoiceError('No se pudo acceder al micrófono.');
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const toggleVoice = () => {
    if (isListening) stopListening();
    else startListening();
  };

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    if (isListening) stopListening();
    stopTyping();

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as any).error ?? `Error ${res.status}`);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let started = false;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;

          try {
            const { text: chunk, error: streamError } = JSON.parse(data);
            if (streamError) { setError(streamError); break; }
            if (chunk) {
              if (!started) {
                started = true;
                setLoading(false);
                setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
                startTyping();
              }
              charQueueRef.current.push(...chunk.split(''));
            }
          } catch {}
        }
      }

      streamDoneRef.current = true;
      if (!started) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sin respuesta.' }]);
      }
    } catch {
      setError('Error de conexión. Revisá tu internet.');
      stopTyping();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <button
        className={`ai-fab ${open ? 'ai-fab-open' : ''}`}
        onClick={() => { setOpen(v => { if (!v) setSuggestions(getRandomSuggestions()); return !v; }); }}
        aria-label="Asistente IA"
        title="Asistente IA"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>

      {open && (
        <div className="ai-panel glass-panel">

          <div className="ai-header">
            <div className="ai-header-info">
              <Sparkles size={15} className="ai-header-icon" />
              <div>
                <div className="ai-header-title">Asistente IA</div>
                <div className="ai-header-sub">FROMNORTH Dashboard</div>
              </div>
            </div>
            <button className="ai-close" onClick={() => setOpen(false)} aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>

          <div className="ai-messages">
            {messages.length === 0 && !loading && (
              <div className="ai-empty">
                <Bot size={30} className="ai-empty-icon" />
                <p>Hola! Puedo consultar ventas, stock, clientes y ejecutar acciones en tu tienda.</p>
                <div className="ai-suggestions">
                  {suggestions.map(s => (
                    <button key={s} className="ai-suggestion" onClick={() => sendMessage(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`ai-msg ai-msg-${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="ai-avatar"><Sparkles size={11} /></div>
                )}
                <div className="ai-bubble">
                  {msg.role === 'assistant'
                    ? renderMarkdown(msg.content)
                    : <p>{msg.content}</p>}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-msg ai-msg-assistant">
                <div className="ai-avatar"><Sparkles size={11} /></div>
                <div className="ai-bubble ai-thinking">
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                </div>
              </div>
            )}

            {error && <div className="ai-error">{error}</div>}
            {voiceError && <div className="ai-error">{voiceError}</div>}

            <div ref={messagesEndRef} />
          </div>

          <div className="ai-input-area">
            {/* Mic button */}
            <button
              className={`ai-mic ${isListening ? 'ai-mic-active' : ''}`}
              onClick={toggleVoice}
              aria-label={isListening ? 'Detener grabación' : 'Mensaje de voz'}
              title={isListening ? 'Detener' : 'Mensaje de voz'}
              disabled={loading}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              {isListening && <span className="ai-mic-ring" />}
            </button>

            <textarea
              ref={inputRef}
              className={`ai-input ${isListening ? 'ai-input-listening' : ''}`}
              placeholder={isListening ? 'Escuchando...' : 'Preguntá algo o pedí una acción...'}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />

            <button
              className="ai-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Enviar"
            >
              <Send size={15} />
            </button>
          </div>

        </div>
      )}
    </>
  );
}
