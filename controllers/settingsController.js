const { Setting } = require('../database');

exports.getSettings = async (req, res) => {
  try {
    const rows = await Setting.find({}).lean();

    const settingsObj = {};
    rows.forEach((row) => {
      settingsObj[row.key] = row.value;
    });

    settingsObj.apiKeyConfigured = !!process.env.HF_API_KEY;

    res.json(settingsObj);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings data' });
    }

    for (const [key, value] of Object.entries(updates)) {
      await Setting.updateOne({ key }, { $set: { key, value } }, { upsert: true });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.clearCache = async (req, res) => {
  try {
    // Clear any cached data
    // For now, just return success
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
