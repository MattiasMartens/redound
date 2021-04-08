const keyRegistry = new Set<string>()

const registerKey = (id: string) => {
  if (keyRegistry.has(id)) {
    throw new Error(`Tried to register key more than once: ${id}`)
  } else {
    keyRegistry.add(id)
    return id
  }
}

