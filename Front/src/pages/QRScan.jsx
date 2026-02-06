// No roomController.js, adicione esta função:
/**
 * ✅ ESCANEAR QR CODE (WORKER)
 * GET /api/rooms/qr/:qrCode
 */
scanQRCode: async (req, res) => {
  try {
    const { qrCode } = req.params;

    if (!qrCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'QR Code é obrigatório' 
      });
    }

    // Buscar sala pelo QR Code
    const room = await prisma.room.findUnique({
      where: { qrCode },
    });

    if (!room) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ambiente não encontrado com este QR Code' 
      });
    }

    // Verificar se há limpeza em andamento nesta sala hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeCleaning = await prisma.cleaningRecord.findFirst({
      where: {
        roomId: room.id,
        status: 'IN_PROGRESS',
        startedAt: {
          gte: today
        }
      },
      include: {
        cleaner: {
          select: { id: true, name: true }
        }
      }
    });

    return res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        type: room.type,
        location: room.location,
        status: room.status,
        qrCode: room.qrCode,
        priority: room.priority,
        lastCleaned: room.lastCleaned,
      },
      isBeingCleaned: !!activeCleaning,
      currentCleaner: activeCleaning?.cleaner || null,
      message: activeCleaning 
        ? `Esta sala está sendo limpa por ${activeCleaning.cleaner?.name || 'alguém'}.` 
        : 'Sala disponível para limpeza.'
    });
  } catch (error) {
    console.error('🔥 Erro ao escanear QR:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao processar QR Code' 
    });
  }
}