const serializeMember = member => {
  const res = { ...member }
  delete res.socket
  return res
}

module.exports = { serializeMember }