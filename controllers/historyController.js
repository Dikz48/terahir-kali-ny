const mongoose = require('mongoose');
const { Chat, Message } = require('../database');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function formatChat(c, extra = {}) {
  return {
    id: c._id.toString(),
    title: c.title,
    pinned: !!c.pinned,
    folder: c.folder || null,
    created_at: c.created_at,
    updated_at: c.updated_at,
    ...extra
  };
}

exports.getHistory = async (req, res) => {
  try {
    const { limit = 50, offset = 0, search = '' } = req.query;

    const match = {};

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      const matchingChatIds = await Message.find({ content: regex }).distinct('chat_id');
      match.$or = [{ title: regex }, { _id: { $in: matchingChatIds } }];
    }

    const chats = await Chat.find(match)
      .sort({ pinned: -1, updated_at: -1 })
      .skip(parseInt(offset) || 0)
      .limit(parseInt(limit) || 50)
      .lean();

    const results = await Promise.all(
      chats.map(async (c) => {
        const message_count = await Message.countDocuments({ chat_id: c._id });
        const lastMsg = await Message.findOne({ chat_id: c._id, role: 'assistant' })
          .sort({ timestamp: -1 })
          .lean();
        return formatChat(c, {
          message_count,
          last_message: lastMsg ? lastMsg.content : null
        });
      })
    );

    res.json({ chats: results, total: results.length });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getChat = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(404).json({ success: false, error: 'Chat tidak ditemukan' });
    }

    const chat = await Chat.findById(id).lean();
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat tidak ditemukan' });
    }

    const messages = await Message.find({ chat_id: id }).sort({ timestamp: 1 }).lean();

    res.json({
      chat: formatChat(chat),
      messages: messages.map((m) => ({
        id: m._id.toString(),
        chat_id: id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }))
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createChat = async (req, res) => {
  try {
    const { title } = req.body;
    const chat = await Chat.create({ title: title || 'Chat Baru' });
    res.json({ id: chat._id.toString(), title: chat.title });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, folder } = req.body;

    if (!isValidId(id)) {
      return res.status(404).json({ success: false, error: 'Chat tidak ditemukan' });
    }

    const update = {};
    if (title !== undefined) update.title = title;
    if (folder !== undefined) update.folder = folder || null;

    await Chat.findByIdAndUpdate(id, update);
    res.json({ success: true });
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteChat = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(404).json({ success: false, error: 'Chat tidak ditemukan' });
    }

    await Message.deleteMany({ chat_id: id });
    await Chat.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.pinChat = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(404).json({ success: false, error: 'Chat tidak ditemukan' });
    }
    await Chat.findByIdAndUpdate(id, { pinned: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Pin chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.unpinChat = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(404).json({ success: false, error: 'Chat tidak ditemukan' });
    }
    await Chat.findByIdAndUpdate(id, { pinned: false });
    res.json({ success: true });
  } catch (error) {
    console.error('Unpin chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.moveToFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { folder } = req.body;
    if (!isValidId(id)) {
      return res.status(404).json({ success: false, error: 'Chat tidak ditemukan' });
    }
    await Chat.findByIdAndUpdate(id, { folder: folder || null });
    res.json({ success: true });
  } catch (error) {
    console.error('Move to folder error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.searchChat = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }

    const regex = new RegExp(q.trim(), 'i');
    const matchingChatIds = await Message.find({ content: regex }).distinct('chat_id');

    const chats = await Chat.find({ $or: [{ title: regex }, { _id: { $in: matchingChatIds } }] })
      .sort({ pinned: -1, updated_at: -1 })
      .lean();

    const results = await Promise.all(
      chats.map(async (c) => {
        const message_count = await Message.countDocuments({ chat_id: c._id });
        return formatChat(c, { message_count });
      })
    );

    res.json({ chats: results });
  } catch (error) {
    console.error('Search chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.exportChat = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(404).json({ success: false, error: 'Chat tidak ditemukan' });
    }

    const chat = await Chat.findById(id).lean();
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat tidak ditemukan' });
    }

    const messages = await Message.find({ chat_id: id }).sort({ timestamp: 1 }).lean();

    res.json({
      chat: {
        id: chat._id.toString(),
        title: chat.title,
        created_at: chat.created_at,
        updated_at: chat.updated_at
      },
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }))
    });
  } catch (error) {
    console.error('Export chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.importChat = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !data.chat || !data.messages) {
      return res.status(400).json({ success: false, error: 'Invalid import data' });
    }

    const chat = await Chat.create({
      title: data.chat.title,
      created_at: data.chat.created_at ? new Date(data.chat.created_at) : new Date(),
      updated_at: new Date()
    });

    for (const msg of data.messages) {
      await Message.create({
        chat_id: chat._id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
      });
    }

    res.json({ id: chat._id.toString(), success: true });
  } catch (error) {
    console.error('Import chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
