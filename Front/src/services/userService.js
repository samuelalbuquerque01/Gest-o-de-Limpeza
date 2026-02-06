import api from './api';

const userService = {
  // Listar todos os usuários (admin)
  getUsers: async (params = {}) => {
    try {
      const response = await api.get('/users', { params });
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

  // Criar usuário (admin)
  createUser: async (userData) => {
    try {
      console.log('📤 [userService] Criando usuário com dados:', userData);
      const response = await api.post('/users', userData);
      console.log('✅ [userService] Usuário criado com sucesso:', response);
      return {
        success: !!response?.success,
        data: response?.user || response?.worker || response?.data || response,
        error: response?.error || response?.message,
      };
    } catch (error) {
      console.error('❌ [userService] Erro ao criar usuário:', error.message);
      console.error('❌ [userService] Dados enviados:', userData);
      return {
        success: false,
        error: error.message || 'Erro ao criar funcionário',
      };
    }
  },

  // Atualizar usuário (admin)
  updateUser: async (id, userData) => {
    try {
      console.log('📤 [userService] Atualizando usuário', id, 'com dados:', userData);
      const response = await api.put(`/users/${id}`, userData);
      console.log('✅ [userService] Usuário atualizado com sucesso:', response);
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

  // Deletar usuário (admin)
  deleteUser: async (id) => {
    try {
      console.log('🗑️ [userService] Deletando usuário', id);
      const response = await api.delete(`/users/${id}`);
      console.log('✅ [userService] Usuário deletado com sucesso:', response);
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

  // Resetar senha (admin)
  resetPassword: async (id, password) => {
    try {
      console.log('🔐 [userService] Resetando senha do usuário', id);
      const response = await api.post(`/users/${id}/reset-password`, { password });
      console.log('✅ [userService] Senha resetada com sucesso:', response);
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

  // Estatísticas de usuários (admin)
  getUserStats: async () => {
    try {
      console.log('📊 [userService] Buscando estatísticas');
      const response = await api.get('/users/stats');
      return {
        success: !!response?.success,
        data: response?.stats || response?.data || response,
        error: response?.error || response?.message,
      };
    } catch (error) {
      console.error('❌ [userService] Erro ao buscar estatísticas de usuários:', error.message);
      return {
        success: false,
        error: error.message || 'Erro ao buscar estatísticas',
      };
    }
  },
};

export default userService;
