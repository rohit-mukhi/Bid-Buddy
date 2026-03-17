export const getPlaceholderImage = (width: number = 300, height: number = 200) => {
  return `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22${width}%22 height=%22${height}%22%3E%3Crect fill=%22%232d2d2d%22 width=%22${width}%22 height=%22${height}%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22 font-family=%22Arial%22%3ENo Image%3C/text%3E%3C/svg%3E`
}
