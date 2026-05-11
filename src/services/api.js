/**
 * DramaGenius API 服务层
 * 
 * 统一封装后端 API 调用，支持：
 * - 普通 REST 请求
 * - SSE 流式响应
 * - JWT 认证
 * - 错误处理
 */

const API_BASE = typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : '/api';

// ============ Token 管理 ============

let accessToken = localStorage.getItem('access_token');
let refreshToken = localStorage.getItem('refresh_token');

export const setTokens = (access, refresh) => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const getAccessToken = () => accessToken;

// ============ 基础请求封装 ============

const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (includeAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    // 401 时尝试刷新 token
    if (response.status === 401 && refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // 重试原请求
        return null; // 调用方需处理重试
      }
    }
    
    const error = await response.json().catch(() => ({ detail: '请求失败' }));
    const detail = error.detail;
    const msg = typeof detail === 'string' ? detail
      : Array.isArray(detail) ? detail.map(d => d.msg || d.message || JSON.stringify(d)).join('; ')
      : `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return response.json();
};

const refreshAccessToken = async () => {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (res.ok) {
      const data = await res.json();
      setTokens(data.access_token, data.refresh_token);
      return true;
    }
  } catch (e) {
    console.error('Token 刷新失败:', e);
  }
  clearTokens();
  return false;
};

// 通用 API 请求
export const api = {
  async get(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async post(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async put(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async delete(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
};

// ============ 认证 API ============

export const authApi = {
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async register(email, name, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });
    return handleResponse(res);
  },

  async getProfile() {
    return api.get('/auth/me');
  },

  logout() {
    clearTokens();
  },
};

// ============ Prophet 舆情 API ============

export const prophetApi = {
  async analyze(query) {
    return api.post('/prophet/analyze', { query });
  },

  async getHotTopics(limit = 10) {
    return api.get(`/prophet/hot-topics?limit=${limit}`);
  },

  async getSnapshot(snapshotId) {
    return api.get(`/prophet/snapshots/${snapshotId}`);
  },
};

// ============ Soul 角色 API ============

export const soulApi = {
  async generateCharacters(projectId, concept) {
    return api.post('/soul/generate', { project_id: projectId, concept });
  },

  async generateDialogue(characterName, personality, scene, speechStyle = '', coreDesire = '') {
    return api.post('/soul/generate-dialogue', {
      character_name: characterName,
      personality,
      scene,
      speech_style: speechStyle,
      core_desire: coreDesire,
    });
  },

  async previewVoice(characterId, text, voiceParams = null) {
    return api.post('/soul/voice-preview', {
      character_id: characterId,
      text,
      voice_params: voiceParams,
    });
  },

  /**
   * CosyVoice v2 TTS — 返回 Blob URL 供 Audio 播放
   * voice: CosyVoice v2 音色 ID，如 longxiaochun_v2
   */
  async synthesizeSpeech(text, voice = 'longxiaochun_v2', speechRate = 1.0, pitchRate = 1.0) {
    const url = `${API_BASE}/soul/tts`;
    console.log('[TTS] 请求 URL:', url, '| voice:', voice);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speech_rate: speechRate, pitch_rate: pitchRate }),
      });
    } catch (netErr) {
      console.error('[TTS] 网络错误 (fetch threw):', netErr, '| URL was:', url);
      throw netErr;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'TTS 失败' }));
      console.error('[TTS] HTTP 错误:', res.status, err);
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    console.log('[TTS] 成功，音频大小:', blob.size, 'bytes');
    return URL.createObjectURL(blob);
  },

  /**
   * 声音克隆 — 上传参考音频，返回克隆 voice_id
   */
  async cloneVoice(audioFile, prefix = 'dg') {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('prefix', prefix);
    const res = await fetch(`${API_BASE}/soul/voice-clone`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '克隆失败' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async uploadReferenceImage(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    const res = await fetch(`${API_BASE}/producer/references/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '参考图上传失败' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async uploadReferenceAsset(file) {
    const formData = new FormData();
    formData.append('asset', file);
    const res = await fetch(`${API_BASE}/producer/references/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '参考资产上传失败' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async getCharacter(characterId) {
    return api.get(`/soul/characters/${characterId}`);
  },

  async updateCharacter(characterId, data) {
    return api.put(`/soul/characters/${characterId}`, data);
  },

  async queryMemory(characterId, context) {
    return api.post('/soul/memory/query', { character_id: characterId, context });
  },
};

// ============ Arbiter 决策 API ============

export const arbiterApi = {
  async designDecisions(projectId, outline) {
    return api.post('/arbiter/design', { project_id: projectId, outline });
  },

  async simulate(decisionId, choice) {
    return api.post('/arbiter/simulate', { decision_id: decisionId, choice });
  },

  async getDecisions(projectId) {
    return api.get(`/arbiter/decisions?project_id=${projectId}`);
  },

  // Demo 模式：流式剧情推演（无需认证）
  simulateStream(scene, question, choice, choiceDescription, callbacks) {
    return streamRequest('/arbiter/simulate-stream', {
      scene, question, choice, choice_description: choiceDescription || '',
    }, callbacks);
  },

  // Demo 模式：生成自定义场景（无需认证）
  async generateScenario(concept) {
    return api.post('/arbiter/generate-scenario', { concept });
  },
};

// ============ Workspace 工作台 API ============

export const workspaceApi = {
  // 创建项目
  async createProject(title, concept) {
    return api.post('/workspace/project', { title, concept });
  },

  // 获取项目列表
  async getProjects() {
    return api.get('/workspace/projects');
  },

  // 获取项目详情
  async getProject(projectId) {
    return api.get(`/workspace/project/${projectId}`);
  },

  // 保存场景
  async saveScene(episodeId, scene) {
    return api.post(`/workspace/episodes/${episodeId}/scenes`, scene);
  },

  // 导出项目
  async exportProject(projectId, format) {
    return api.post('/workspace/export', { project_id: projectId, format });
  },

  // 删除项目
  async deleteProject(projectId) {
    return api.delete(`/workspace/project/${projectId}`);
  },
};

// ============ SSE 流式 API ============

/**
 * 发起 SSE 流式请求
 * @param {string} endpoint - API 端点
 * @param {object} data - POST 数据
 * @param {function} onMessage - 消息回调 (data, event) => void
 * @param {function} onError - 错误回调 (error) => void
 * @param {function} onComplete - 完成回调 () => void
 * @returns {function} 取消函数
 */
export const streamRequest = (endpoint, data, { onMessage, onError, onComplete }) => {
  const controller = new AbortController();
  
  (async () => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') {
              onComplete?.();
              return;
            }
            try {
              const parsed = JSON.parse(jsonStr);
              onMessage?.(parsed.data || parsed, parsed.event || 'message');
            } catch (e) {
              // 非 JSON 数据，可能是纯文本
              onMessage?.(jsonStr, 'text');
            }
          } else if (line.startsWith('event: ')) {
            // 事件类型行，下一行的 data 会用到
          }
        }
      }

      onComplete?.();
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError?.(error);
      }
    }
  })();

  return () => controller.abort();
};

/**
 * 方案生成 - SSE 流式
 * 
 * 4 阶段流式返回：
 * 1. prophet - 舆情分析
 * 2. soul - 角色生成
 * 3. arbiter - 决策设计
 * 4. outline - 大纲生成
 */
export const generatePlanStream = (concept, callbacks) => {
  return streamRequest('/workspace/generate-plan', { concept }, {
    onMessage: (data, event) => {
      switch (event) {
        case 'stage_start':
          callbacks.onStageStart?.(data.stage);
          break;
        case 'stage_progress':
          callbacks.onStageProgress?.(data.stage, data.content);
          break;
        case 'stage_complete':
          callbacks.onStageComplete?.(data.stage, data.result);
          break;
        case 'text':
          // 纯文本流式输出（大纲生成时）
          callbacks.onText?.(data);
          break;
        default:
          callbacks.onMessage?.(data, event);
      }
    },
    onError: callbacks.onError,
    onComplete: callbacks.onComplete,
  });
};

/**
 * 剧本续写 - SSE 流式
 */
export const continueScriptStream = (params, callbacks) => {
  return streamRequest('/workspace/continue', params, {
    onMessage: (data, event) => {
      if (event === 'text' || typeof data === 'string') {
        callbacks.onText?.(data);
      } else {
        callbacks.onMessage?.(data, event);
      }
    },
    onError: callbacks.onError,
    onComplete: callbacks.onComplete,
  });
};

export default api;
