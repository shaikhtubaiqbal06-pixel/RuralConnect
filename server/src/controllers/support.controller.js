import prisma from '../config/db.js';

export const getSupportConversations = async (req, res) => {
  try {
    const entrepreneurProfile = req.user.role === 'ENTREPRENEUR'
      ? await prisma.entrepreneurProfile.findUnique({ where: { userId: req.user.id } })
      : null;
    if (req.user.role === 'ENTREPRENEUR' && !entrepreneurProfile) {
      return res.status(403).json({ message: 'Entrepreneur profile not found.' });
    }

    const conversations = await prisma.supportConversation.findMany({
      where: req.user.role === 'ENTREPRENEUR'
        ? { entrepreneurId: entrepreneurProfile.id }
        : { customerId: req.user.id },
      include: {
        customer: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        entrepreneur: {
          select: { id: true, businessName: true },
        },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ conversations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to fetch support conversations.' });
  }
};

export const createConversation = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required.' });
    }

    const conversation = await prisma.supportConversation.create({
      data: {
        customerId: req.user.id,
        subject,
        status: 'OPEN',
        messages: {
          create: [{ senderId: req.user.id, content: message }],
        },
      },
      include: { messages: true },
    });

    return res.status(201).json({ conversation });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to create support conversation.' });
  }
};

export const addMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    const conversation = await prisma.supportConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const entrepreneurProfile = req.user.role === 'ENTREPRENEUR'
      ? await prisma.entrepreneurProfile.findUnique({ where: { userId: req.user.id } })
      : null;
    const isCustomer = conversation.customerId === req.user.id;
    const isAssignedEntrepreneur = entrepreneurProfile
      && conversation.entrepreneurId === entrepreneurProfile.id;
    if (!isCustomer && !isAssignedEntrepreneur) {
      return res.status(403).json({ message: 'You do not have access to this conversation.' });
    }

    const message = await prisma.supportMessage.create({
      data: {
        conversationId,
        senderId: req.user.id,
        content: content.trim(),
      },
    });

    return res.status(201).json({ message: message });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to send message.' });
  }
};
