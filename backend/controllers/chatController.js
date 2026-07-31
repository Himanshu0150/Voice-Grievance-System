const chatService = require('../services/chatService');
const response = require('../utils/responseHelper');

const chatController = {
  async ask(req, res, next) {
    try {
      const { message } = req.body;
      const result = await chatService.ask(message, req.user);
      return response.success(res, result, 'Chat response generated');
    } catch (err) {
      next(err);
    }
  }
};

module.exports = chatController;
