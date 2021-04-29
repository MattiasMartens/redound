export function scalarSort<T>(fn: (t: T) => string | number) {
  return (a: T, b: T) => {
    const scalarA = fn(a)
    const scalarB = fn(b)
    if (scalarA > scalarB) {
      return 1
    } else if (scalarA < scalarB) {
      return -1
    } else {
      return 0
    }
  }
}
