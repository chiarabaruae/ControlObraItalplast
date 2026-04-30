export function errorHandler(error, _request, response, _next) {
  console.error(error);

  response.status(500).json({
    success: false,
    error: "Ocurrio un error inesperado."
  });
}
