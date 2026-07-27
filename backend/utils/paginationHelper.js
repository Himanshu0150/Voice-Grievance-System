const { PAGINATION } = require('../config/constants');

function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function getSearchParams(query) {
  const search = query.search ? `%${query.search}%` : null;
  const status = query.status || null;
  const category = query.category || null;
  const fromDate = query.from || null;
  const toDate = query.to || null;
  return { search, status, category, fromDate, toDate };
}

module.exports = { getPaginationParams, getSearchParams };
