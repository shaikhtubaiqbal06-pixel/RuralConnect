import prisma from '../config/db.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to fetch notifications.' });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    return res.json({ notification });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to mark notification as read.' });
  }
};
