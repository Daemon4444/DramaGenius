/**
 * SSE 流式响应 Hook
 * 
 * 用于处理服务器发送事件（Server-Sent Events）的 React Hook
 * 支持多阶段流式、打字机效果、取消请求等
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { streamRequest } from '../services/api';

/**
 * 通用 SSE 流式 Hook
 * 
 * @example
 * const { start, cancel, isStreaming, data, error } = useSSE('/api/stream');
 * start({ prompt: 'hello' });
 */
export function useSSE(endpoint) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [textBuffer, setTextBuffer] = useState('');
  
  const cancelRef = useRef(null);

  const start = useCallback((requestData, callbacks = {}) => {
    // 取消之前的请求
    if (cancelRef.current) {
      cancelRef.current();
    }

    setIsStreaming(true);
    setError(null);
    setTextBuffer('');
    setData(null);

    cancelRef.current = streamRequest(endpoint, requestData, {
      onMessage: (msg, event) => {
        if (typeof msg === 'string') {
          setTextBuffer(prev => prev + msg);
        } else {
          setData(msg);
        }
        callbacks.onMessage?.(msg, event);
      },
      onError: (err) => {
        setError(err);
        setIsStreaming(false);
        callbacks.onError?.(err);
      },
      onComplete: () => {
        setIsStreaming(false);
        callbacks.onComplete?.();
      },
    });
  }, [endpoint]);

  const cancel = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  // 组件卸载时自动取消
  useEffect(() => {
    return () => {
      if (cancelRef.current) {
        cancelRef.current();
      }
    };
  }, []);

  return {
    start,
    cancel,
    isStreaming,
    data,
    error,
    textBuffer,
  };
}

/**
 * 多阶段流式 Hook
 * 
 * 专门用于方案生成等多阶段流程
 * 
 * @example
 * const { start, stages, currentStage, isComplete } = useMultiStageSSE('/api/workspace/generate-plan');
 * start({ concept: '职场复仇短剧' });
 */
export function useMultiStageSSE(endpoint) {
  const [stages, setStages] = useState({
    prophet: { status: 'pending', data: null },
    soul: { status: 'pending', data: null },
    arbiter: { status: 'pending', data: null },
    outline: { status: 'pending', data: null },
  });
  const [currentStage, setCurrentStage] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [outlineText, setOutlineText] = useState('');
  
  const cancelRef = useRef(null);

  const start = useCallback((requestData) => {
    if (cancelRef.current) {
      cancelRef.current();
    }

    // 重置状态
    setStages({
      prophet: { status: 'pending', data: null },
      soul: { status: 'pending', data: null },
      arbiter: { status: 'pending', data: null },
      outline: { status: 'pending', data: null },
    });
    setCurrentStage(null);
    setIsStreaming(true);
    setIsComplete(false);
    setError(null);
    setOutlineText('');

    cancelRef.current = streamRequest(endpoint, requestData, {
      onMessage: (data, event) => {
        switch (event) {
          case 'stage_start':
            setCurrentStage(data.stage);
            setStages(prev => ({
              ...prev,
              [data.stage]: { status: 'streaming', data: null },
            }));
            break;
            
          case 'stage_progress':
            // 流式文本更新（如大纲生成）
            if (data.stage === 'outline') {
              setOutlineText(prev => prev + (data.content || ''));
            }
            break;
            
          case 'stage_complete':
            setStages(prev => ({
              ...prev,
              [data.stage]: { status: 'complete', data: data.result },
            }));
            break;
            
          case 'text':
            // 纯文本流
            setOutlineText(prev => prev + data);
            break;
        }
      },
      onError: (err) => {
        setError(err);
        setIsStreaming(false);
      },
      onComplete: () => {
        setIsStreaming(false);
        setIsComplete(true);
        setCurrentStage(null);
      },
    });
  }, [endpoint]);

  const cancel = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (cancelRef.current) {
        cancelRef.current();
      }
    };
  }, []);

  return {
    start,
    cancel,
    stages,
    currentStage,
    isStreaming,
    isComplete,
    error,
    outlineText,
  };
}

/**
 * 打字机效果 Hook
 * 
 * 将 SSE 流式文本以打字机效果展示
 * 
 * @example
 * const { text, start, isTyping } = useTypewriter('/api/workspace/continue');
 * start({ context: '...' });
 */
export function useTypewriter(endpoint, options = {}) {
  const {
    typingSpeed = 30, // 每字符间隔 (ms)
    onComplete,
  } = options;

  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  
  const bufferRef = useRef('');
  const displayIndexRef = useRef(0);
  const timerRef = useRef(null);
  const cancelRef = useRef(null);

  // 打字机动画
  const typeNext = useCallback(() => {
    if (displayIndexRef.current < bufferRef.current.length) {
      setDisplayText(bufferRef.current.slice(0, displayIndexRef.current + 1));
      displayIndexRef.current++;
      timerRef.current = setTimeout(typeNext, typingSpeed);
    } else if (!isStreaming) {
      setIsTyping(false);
      onComplete?.();
    }
  }, [typingSpeed, isStreaming, onComplete]);

  const start = useCallback((requestData, initialText = '') => {
    // 清理
    if (cancelRef.current) cancelRef.current();
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // 重置状态
    bufferRef.current = initialText;
    displayIndexRef.current = initialText.length;
    setDisplayText(initialText);
    setIsStreaming(true);
    setIsTyping(true);
    setError(null);

    cancelRef.current = streamRequest(endpoint, requestData, {
      onMessage: (data) => {
        const text = typeof data === 'string' ? data : data.content || '';
        bufferRef.current += text;
        
        // 如果打字机已停止，重新启动
        if (!timerRef.current) {
          typeNext();
        }
      },
      onError: (err) => {
        setError(err);
        setIsStreaming(false);
      },
      onComplete: () => {
        setIsStreaming(false);
      },
    });

    // 开始打字
    typeNext();
  }, [endpoint, typeNext]);

  const cancel = useCallback(() => {
    if (cancelRef.current) cancelRef.current();
    if (timerRef.current) clearTimeout(timerRef.current);
    cancelRef.current = null;
    timerRef.current = null;
    setIsStreaming(false);
    setIsTyping(false);
  }, []);

  // 立即显示所有文本（跳过动画）
  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayText(bufferRef.current);
    displayIndexRef.current = bufferRef.current.length;
    setIsTyping(false);
  }, []);

  useEffect(() => {
    return () => {
      if (cancelRef.current) cancelRef.current();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    text: displayText,
    fullText: bufferRef.current,
    start,
    cancel,
    flush,
    isTyping,
    isStreaming,
    error,
  };
}

export default useSSE;
