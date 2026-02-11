import api from './api';

const userService = {
  // ... SEUS MÉTODOS EXISTENTES ...
  // (getUsers, createUser, updateUser, deleteUser, resetPassword, getUserStats)

  // =========================================================
  // ✅ NOVOS MÉTODOS - ESTATÍSTICAS DOS FUNCIONÁRIOS
  // =========================================================

  /**
   * ✅ Buscar estatísticas de limpeza de um funcionário
   * GET /api/users/:id/stats
   * @param {string} userId - ID do funcionário
   * @returns {Promise} { total, today, week, month, averageTime, lastCleaning }
   */
  getWorkerStats: async (userId) => {
    try {
      console.log(`📊 [userService] Buscando estatísticas do funcionário ${userId}`);
      const response = await api.get(`/users/${userId}/stats`);
      
      console.log('✅ [userService] Estatísticas recebidas:', response);
      
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

  /**
   * ✅ Buscar histórico de login de um funcionário
   * GET /api/users/:id/login-history
   * @param {string} userId - ID do funcionário
   * @returns {Promise} { lastLogin, firstLogin, count, activities }
   */
  getUserLoginHistory: async (userId) => {
    try {
      console.log(`🔐 [userService] Buscando histórico de login do funcionário ${userId}`);
      const response = await api.get(`/users/${userId}/login-history`);
      
      console.log('✅ [userService] Histórico de login recebido:', response);
      
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

  /**
   * ✅ Buscar performance detalhada de um funcionário
   * GET /api/users/:id/performance
   * @param {string} userId - ID do funcionário
   * @returns {Promise} { byDayOfWeek, byHour, byRoomType }
   */
  getWorkerPerformance: async (userId) => {
    try {
      console.log(`📈 [userService] Buscando performance do funcionário ${userId}`);
      const response = await api.get(`/users/${userId}/performance`);
      
      console.log('✅ [userService] Performance recebida:', response);
      
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

  // =========================================================
  // ✅ MÉTODO PARA ATUALIZAR O WORKERS.JSX COM OS DADOS REAIS
  // =========================================================

  /**
   * ✅ Buscar dados COMPLETOS de um funcionário (stats + login history)
   * @param {string} userId - ID do funcionário
   * @returns {Promise} Dados consolidados
   */
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