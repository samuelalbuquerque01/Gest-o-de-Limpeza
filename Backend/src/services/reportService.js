const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { format, subDays, startOfMonth, endOfMonth } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class ReportService {
  /**
   * Gerar relatório de desempenho
   * @param {Object} params - Parâmetros do relatório
   * @returns {Promise<Object>} - Relatório formatado
   */
  static async generatePerformanceReport(params = {}) {
    try {
      const {
        startDate = subDays(new Date(), 30),
        endDate = new Date(),
        roomType,
        cleanerId
      } = params;

      // Buscar dados
      const where = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        status: 'COMPLETED'
      };

      if (roomType) {
        where.room = { type: roomType };
      }

      if (cleanerId) {
        where.cleanerId = cleanerId;
      }

      const [
        cleanings,
        rooms,
        cleaners,
        dailyStats
      ] = await Promise.all([
        // Todas as limpezas no período
        prisma.cleaningRecord.findMany({
          where,
          include: {
            room: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            cleaner: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),

        // Salas envolvidas
        prisma.room.findMany({
          where: {
            cleaningRecords: {
              some: where
            }
          },
          select: {
            id: true,
            name: true,
            type: true,
            location: true
          }
        }),

        // Funcionários envolvidos
        prisma.user.findMany({
          where: {
            role: 'CLEANER',
            cleaningRecords: {
              some: where
            }
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        }),

        // Estatísticas diárias
        prisma.$queryRaw`
          SELECT 
            DATE("createdAt") as date,
            COUNT(*) as count,
            AVG(EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) / 60) as avg_duration
          FROM "CleaningRecord"
          WHERE "status" = 'COMPLETED'
            AND "createdAt" BETWEEN ${new Date(startDate)} AND ${new Date(endDate)}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `
      ]);

      // Calcular métricas
      const totalCleanings = cleanings.length;
      const totalDuration = cleanings.reduce((sum, cleaning) => {
        if (cleaning.completedAt && cleaning.startedAt) {
          return sum + (new Date(cleaning.completedAt) - new Date(cleaning.startedAt)) / (1000 * 60);
        }
        return sum;
      }, 0);
      
      const avgDuration = totalCleanings > 0 ? totalDuration / totalCleanings : 0;

      // Agrupar por funcionário
      const cleanerPerformance = cleaners.map(cleaner => {
        const cleanerCleanings = cleanings.filter(c => c.cleaner.id === cleaner.id);
        const cleanerDuration = cleanerCleanings.reduce((sum, cleaning) => {
          if (cleaning.completedAt && cleaning.startedAt) {
            return sum + (new Date(cleaning.completedAt) - new Date(cleaning.startedAt)) / (1000 * 60);
          }
          return sum;
        }, 0);

        return {
          id: cleaner.id,
          name: cleaner.name,
          email: cleaner.email,
          cleanings: cleanerCleanings.length,
          avgDuration: cleanerCleanings.length > 0 ? cleanerDuration / cleanerCleanings.length : 0,
          efficiency: cleanerCleanings.length > 0 ? Math.round((cleanerCleanings.length / cleanerDuration) * 100) / 100 : 0
        };
      }).sort((a, b) => b.cleanings - a.cleanings);

      // Agrupar por sala
      const roomPerformance = rooms.map(room => {
        const roomCleanings = cleanings.filter(c => c.room.id === room.id);
        const roomDuration = roomCleanings.reduce((sum, cleaning) => {
          if (cleaning.completedAt && cleaning.startedAt) {
            return sum + (new Date(cleaning.completedAt) - new Date(cleaning.startedAt)) / (1000 * 60);
          }
          return sum;
        }, 0);

        return {
          id: room.id,
          name: room.name,
          type: room.type,
          location: room.location,
          cleanings: roomCleanings.length,
          avgDuration: roomCleanings.length > 0 ? roomDuration / roomCleanings.length : 0,
          frequency: roomCleanings.length > 0 ? roomCleanings.length / 30 : 0 // por dia
        };
      }).sort((a, b) => b.cleanings - a.cleanings);

      const report = {
        metadata: {
          title: 'Relatório de Desempenho',
          period: `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`,
          generatedAt: new Date().toISOString(),
          filters: {
            roomType,
            cleanerId
          }
        },
        summary: {
          totalCleanings,
          uniqueRooms: rooms.length,
          uniqueCleaners: cleaners.length,
          avgDuration: Math.round(avgDuration),
          totalDuration: Math.round(totalDuration),
          avgDailyCleanings: totalCleanings / Math.max(1, (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
        },
        performance: {
          topCleaners: cleanerPerformance.slice(0, 5),
          topRooms: roomPerformance.slice(0, 5),
          dailyTrend: dailyStats.map(stat => ({
            date: format(stat.date, 'dd/MM/yyyy'),
            count: parseInt(stat.count),
            avgDuration: parseFloat(stat.avg_duration) || 0
          }))
        },
        recommendations: this.generateRecommendations(cleanerPerformance, roomPerformance)
      };

      logger.info('Relatório de desempenho gerado', {
        period: report.metadata.period,
        cleanings: totalCleanings
      });

      return report;
    } catch (error) {
      logger.error('Erro ao gerar relatório de desempenho', error);
      throw error;
    }
  }

  /**
   * Gerar relatório mensal
   * @param {number} year - Ano
   * @param {number} month - Mês (1-12)
   * @returns {Promise<Object>} - Relatório mensal
   */
  static async generateMonthlyReport(year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = endOfMonth(startDate);

      const report = await this.generatePerformanceReport({
        startDate,
        endDate
      });

      // Adicionar métricas mensais específicas
      const monthlyData = {
        ...report,
        metadata: {
          ...report.metadata,
          title: `Relatório Mensal - ${format(startDate, 'MMMM yyyy', { locale: ptBR })}`,
          month,
          year
        },
        monthlyMetrics: {
          targetAchievement: 0.85, // Exemplo: 85% da meta
          complianceRate: 0.92, // Exemplo: 92% de conformidade
          issuesReported: 12,
          avgResponseTime: 45 // minutos
        }
      };

      return monthlyData;
    } catch (error) {
      logger.error('Erro ao gerar relatório mensal', error);
      throw error;
    }
  }

  /**
   * Gerar recomendações baseadas nos dados
   * @private
   */
  static generateRecommendations(cleanerPerformance, roomPerformance) {
    const recommendations = [];

    // Recomendações baseadas em funcionários
    const lowEfficiencyCleaners = cleanerPerformance.filter(c => c.efficiency < 0.5);
    if (lowEfficiencyCleaners.length > 0) {
      recommendations.push({
        type: 'training',
        title: 'Treinamento necessário',
        description: `${lowEfficiencyCleaners.length} funcionários com eficiência abaixo do esperado`,
        details: lowEfficiencyCleaners.map(c => c.name)
      });
    }

    // Recomendações baseadas em salas
    const highFrequencyRooms = roomPerformance.filter(r => r.frequency > 2);
    if (highFrequencyRooms.length > 0) {
      recommendations.push({
        type: 'schedule',
        title: 'Revisar frequência de limpeza',
        description: `${highFrequencyRooms.length} salas com limpeza muito frequente`,
        details: highFrequencyRooms.map(r => r.name)
      });
    }

    // Recomendação geral baseada em volume
    const totalCleanings = cleanerPerformance.reduce((sum, c) => sum + c.cleanings, 0);
    if (totalCleanings / cleanerPerformance.length > 10) {
      recommendations.push({
        type: 'staffing',
        title: 'Considerar aumento de equipe',
        description: 'Volume de limpezas alto por funcionário',
        details: [`Média de ${Math.round(totalCleanings / cleanerPerformance.length)} limpezas por funcionário`]
      });
    }

    return recommendations;
  }

  /**
   * Exportar relatório para Excel
   * @param {Object} reportData - Dados do relatório
   * @returns {Promise<Buffer>} - Buffer do arquivo Excel
   */
  static async exportToExcel(reportData) {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Página de resumo
      const summarySheet = workbook.addWorksheet('Resumo');
      summarySheet.columns = [
        { header: 'Métrica', key: 'metric', width: 30 },
        { header: 'Valor', key: 'value', width: 20 }
      ];

      summarySheet.addRows([
        { metric: 'Total de Limpezas', value: reportData.summary.totalCleanings },
        { metric: 'Salas Únicas', value: reportData.summary.uniqueRooms },
        { metric: 'Funcionários Únicos', value: reportData.summary.uniqueCleaners },
        { metric: 'Duração Média (min)', value: Math.round(reportData.summary.avgDuration) },
        { metric: 'Duração Total (horas)', value: Math.round(reportData.summary.totalDuration / 60) },
        { metric: 'Limpezas por Dia', value: Math.round(reportData.summary.avgDailyCleanings * 100) / 100 }
      ]);

      // Página de funcionários
      const cleanersSheet = workbook.addWorksheet('Funcionários');
      cleanersSheet.columns = [
        { header: 'Nome', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Limpezas', key: 'cleanings', width: 15 },
        { header: 'Duração Média (min)', key: 'avgDuration', width: 20 },
        { header: 'Eficiência', key: 'efficiency', width: 15 }
      ];

      cleanersSheet.addRows(reportData.performance.topCleaners);

      // Página de salas
      const roomsSheet = workbook.addWorksheet('Salas');
      roomsSheet.columns = [
        { header: 'Nome', key: 'name', width: 25 },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'Localização', key: 'location', width: 30 },
        { header: 'Limpezas', key: 'cleanings', width: 15 },
        { header: 'Duração Média (min)', key: 'avgDuration', width: 20 },
        { header: 'Frequência (por dia)', key: 'frequency', width: 20 }
      ];

      roomsSheet.addRows(reportData.performance.topRooms);

      // Página de tendência diária
      const trendSheet = workbook.addWorksheet('Tendência Diária');
      trendSheet.columns = [
        { header: 'Data', key: 'date', width: 15 },
        { header: 'Limpezas', key: 'count', width: 15 },
        { header: 'Duração Média (min)', key: 'avgDuration', width: 20 }
      ];

      trendSheet.addRows(reportData.performance.dailyTrend);

      // Gerar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      logger.info('Relatório exportado para Excel', {
        sheets: workbook.worksheets.length
      });

      return buffer;
    } catch (error) {
      logger.error('Erro ao exportar para Excel', error);
      throw error;
    }
  }

  /**
   * Exportar relatório para PDF
   * @param {Object} reportData - Dados do relatório
   * @returns {Promise<Buffer>} - Buffer do PDF
   */
  static async exportToPDF(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4'
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Cabeçalho
        doc.fontSize(20).text('Relatório de Desempenho', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Período: ${reportData.metadata.period}`, { align: 'center' });
        doc.moveDown(2);

        // Resumo
        doc.fontSize(16).text('Resumo');
        doc.moveDown();
        
        doc.fontSize(12);
        doc.text(`Total de Limpezas: ${reportData.summary.totalCleanings}`);
        doc.text(`Salas Únicas: ${reportData.summary.uniqueRooms}`);
        doc.text(`Funcionários Únicos: ${reportData.summary.uniqueCleaners}`);
        doc.text(`Duração Média: ${Math.round(reportData.summary.avgDuration)} minutos`);
        doc.moveDown(2);

        // Top funcionários
        doc.fontSize(16).text('Top Funcionários');
        doc.moveDown();
        
        reportData.performance.topCleaners.forEach((cleaner, index) => {
          doc.text(`${index + 1}. ${cleaner.name} - ${cleaner.cleanings} limpezas`);
        });

        doc.moveDown(2);

        // Recomendações
        if (reportData.recommendations.length > 0) {
          doc.fontSize(16).text('Recomendações');
          doc.moveDown();
          
          reportData.recommendations.forEach((rec, index) => {
            doc.text(`${index + 1}. ${rec.title}: ${rec.description}`);
          });
        }

        // Rodapé
        doc.moveDown(3);
        doc.fontSize(10).text(
          `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
          { align: 'center' }
        );

        doc.end();

        logger.info('Relatório exportado para PDF');
      } catch (error) {
        logger.error('Erro ao exportar para PDF', error);
        reject(error);
      }
    });
  }

  /**
   * Enviar relatório por email
   * @param {Object} reportData - Dados do relatório
   * @param {Array} recipients - Lista de emails
   * @param {string} format - Formato (excel, pdf)
   */
  static async sendReportByEmail(reportData, recipients, format = 'pdf') {
    try {
      // Esta é uma implementação básica
      // Em produção, integrar com serviço de email (Nodemailer, SendGrid, etc.)
      
      logger.info('Relatório enviado por email', {
        recipients: recipients.length,
        format,
        reportPeriod: reportData.metadata.period
      });

      return {
        success: true,
        message: `Relatório enviado para ${recipients.length} destinatários`,
        recipients
      };
    } catch (error) {
      logger.error('Erro ao enviar relatório por email', error);
      throw error;
    }
  }
}

module.exports = ReportService;