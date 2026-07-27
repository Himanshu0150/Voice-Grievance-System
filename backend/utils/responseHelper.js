function timestamp() {
  return new Date().toISOString();
}

function success(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: timestamp()
  });
}

function created(res, data = null, message = 'Created successfully') {
  return success(res, data, message, 201);
}

function paginated(res, data, total, page, limit) {
  return res.status(200).json({
    success: true,
    message: 'Success',
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    timestamp: timestamp()
  });
}

function error(res, message = 'Internal server error', statusCode = 500, errors = null) {
  const response = {
    success: false,
    message,
    timestamp: timestamp()
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
}

function badRequest(res, message = 'Bad request') {
  return error(res, message, 400);
}

function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}

function notFound(res, message = 'Resource not found') {
  return error(res, message, 404);
}

function conflict(res, message = 'Conflict') {
  return error(res, message, 409);
}

module.exports = { success, created, paginated, error, badRequest, unauthorized, forbidden, notFound, conflict };
