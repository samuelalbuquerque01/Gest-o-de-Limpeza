import api from './api';

const userService = {
  // =========================================================
  // ✅ MÉTODO PRINCIPAL - FALTANDO!
  // =========================================================
  getUsers: async (params = {}) => {
    try {
      console.log('📥 [userService] Buscando usuários...');
      const response = await api.get('/users', { params });
      
      console.log('✅ [userService] Usuários recebidos:', response);
      
      return {
        success: !!response?.success,
        data: response?.users || response?.workers || response?.data || [],
        error: response?.error || response?.message,
      };
    } catch (error) {
      console.error('❌ [userService] Erro ao buscar usuários:', error.message);
      return {
        success: false,
        data: [],
        error: error.message || 'Erro ao carregar funcionários',
      };
    }
  },

  // =========================================================
  // ✅ MÉTODOS DE CRUD
  // =========================================================
  createUser: async (userData) => {
    try {
      console.log('📤 [userService] Criando usuário:', userData);
      const response = await api.post('/users', userData);
      return {
        success: !!response?.success,
        data: response?.user || response?.worker || response?.data || response,
        error: response?.error || response?.message,
      };
    } catch (error) {
      console.error('❌ [userService] Erro ao criar usuário:', error.message);
      return {
        success: false,
        error: error.message || 'Erro ao criar funcionário',
      };
    }
  },

  updateUser: async (id, userData) => {
    try {
      console.log(`📤 [userService] Atualizando usuário ${id}:`, userData);
      const response = await api.put(`/users/${id}`, userData);
      return {
        success: !!response?.success,
        data: response?.user || response?.worker || response?.data || response,
        error: response?.error || response?.message,
      };
    } catch (error) {
      console.error(`❌ [userService] Erro ao atualizar usuário ${id}:`, error.message);
      return {
        success: false,
        error: error.message || 'Erro ao atualizar funcionário',
      };
    }
  },

  deleteUser: async (id) => {
    try {
      console.log(`🗑️ [userService] Deletando usuário ${id}`);
      const response = await api.delete(`/users/${id}`);
      return {
        success: !!response?.success,
        data: response?.data || null,
        error: response?.error || response?.message,
      };
    } catch (error) {
      console.error(`❌ [userService] Erro ao deletar usuário ${id}:`, error.message);
      return {
        success: false,
        error: error.message || 'Erro ao excluir funcionário',
      };
    }
  },

  resetPassword: async (id, password) => {
    try {
      console.log(`🔐 [userService] Resetando senha do usuário ${id}`);
      const response = await api.post(`/users/${id}/reset-password`, { password });
      return {
        success: !!response?.success,
        data: response?.data || null,
        error: response?.error || response?.message,
      };
    } catch (error) {
      console.error(`❌ [userService] Erro ao resetar senha do usuário ${id}:`, error.message);
      return {
        success: false,
        error: error.message || 'Erro ao resetar senha',
      };
    }
  },

  getUserStats: async () => {
    try {
      console.log('📊 [userService] Buscando estatísticas gerais');
      const response = await api.get('/users/stats');
      return {
        success: !!response?.success,
        data: response?.stats || response?.data || response,
        error: response?.error || response?.message,
      };
    } catch (error) {
      console.error('❌ [userService] Erro ao buscar estatísticas:', error.message);
      return {
        success: false,
        error: error.message || 'Erro ao buscar estatísticas',
      };
    }
  },

  // =========================================================
  // ✅ NOVOS MÉTODOS - ESTATÍSTICAS DOS FUNCIONÁRIOS
  // =========================================================
  getWorkerStats: async (userId) => {
    try {
      console.log(`📊 [userService] Buscando estatísticas do funcionário ${userId}`);
      const response = await api.get(`/users/${userId}/stats`);
      
      return {
        success: true,
        total: response.total || 0,
        today: response.today || 0,
        week: response.week || 0,
        month: response.month || 0,
        pending: response.pending || 0,
        inProgress: response.inProgress || 0,
        averageTime: response.averageTime || 0,
        lastCleaning: response.lastCleaning || null,
      };
    } catch (error) {
      console.error(`❌ [userService] Erro ao buscar estatísticas do funcionário ${userId}:`, error.message);
      return {
        success: false,
        total: 0,
        today: 0,
        week: 0,
        month: 0,
        averageTime: 0,
        lastCleaning: null,
        error: error.message || 'Erro ao buscar estatísticas',
      };
    }
  },

  getUserLoginHistory: async (userId) => {
    try {
      console.log(`🔐 [userService] Buscando histórico de login do funcionário ${userId}`);
      const response = await api.get(`/users/${userId}/login-history`);
      
      return {
        success: true,
        lastLogin: response.lastLogin || null,
        firstLogin: response.firstLogin || null,
        count: response.totalLogins || response.activityCount || 0,
        activities: response.activities || [],
        lastLoginDaysAgo: response.lastLoginDaysAgo || null,
      };
    } catch (error) {
      console.error(`❌ [userService] Erro ao buscar histórico de login do funcionário ${userId}:`, error.message);
      return {
        success: false,
        lastLogin: null,
        firstLogin: null,
        count: 0,
        activities: [],
        error: error.message || 'Erro ao buscar histórico de login',
      };
    }
  },

  getWorkerPerformance: async (userId) => {
    try {
      console.log(`📈 [userService] Buscando performance do funcionário ${userId}`);
      const response = await api.get(`/users/${userId}/performance`);
      
      return {
        success: true,
        byDayOfWeek: response.byDayOfWeek || [],
        byHour: response.byHour || [],
        byRoomType: response.byRoomType || [],
        totalRooms: response.totalRooms || 0,
      };
    } catch (error) {
      console.error(`❌ [userService] Erro ao buscar performance do funcionário ${userId}:`, error.message);
      return {
        success: false,
        byDayOfWeek: [],
        byHour: [],
        byRoomType: [],
        error: error.message || 'Erro ao buscar performance',
      };
    }
  },

  getWorkerFullData: async (userId) => {
    try {
      const [stats, loginHistory] = await Promise.all([
        userService.getWorkerStats(userId),
        userService.getUserLoginHistory(userId)
      ]);

      return {
        success: stats.success && loginHistory.success,
        stats: {
          total: stats.total,
          today: stats.today,
          week: stats.week,
          month: stats.month,
          averageTime: stats.averageTime,
          lastCleaning: stats.lastCleaning,
        },
        login: {
          lastLogin: loginHistory.lastLogin,
          firstLogin: loginHistory.firstLogin,
          count: loginHistory.count,
          activities: loginHistory.activities,
        }
      };
    } catch (error) {
      console.error(`❌ [userService] Erro ao buscar dados completos do funcionário ${userId}:`, error.message);
      return {
        success: false,
        stats: { total: 0, today: 0 },
        login: { lastLogin: null, count: 0 }
      };
    }
  }
};

export default userService;