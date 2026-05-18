export function errorHandler(error, _request, response, _next) {
  console.error(error);

  response.status(error.status ?? 500).json({
    success: false,
    error: error.status ? error.message : "Ocurrio un error inesperado."
  });
}
