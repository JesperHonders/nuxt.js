import * as utils from '../../src/utils/'
import { consola, mockNuxt, mockBuilder, mockGetNuxtConfig, NuxtCommand } from '../utils'

describe('dev', () => {
  let dev

  beforeAll(async () => {
    dev = await import('../../src/commands/dev').then(m => m.default)
    // TODO: Below spyOn can be removed in v3 when force-exit is default false
    jest.spyOn(utils, 'forceExit').mockImplementation(() => {})
  })

  afterEach(() => jest.clearAllMocks())

  test('has run function', () => {
    expect(typeof dev.run).toBe('function')
  })

  test('reloads on fileRestartHook', async () => {
    const Nuxt = mockNuxt()
    const Builder = mockBuilder()

    await NuxtCommand.from(dev).run()

    expect(consola.error).not.toHaveBeenCalled()

    expect(Builder.prototype.build).toHaveBeenCalled()
    expect(Nuxt.prototype.server.listen).toHaveBeenCalled()
    // expect(Builder.prototype.watchRestart).toHaveBeenCalled()

    jest.clearAllMocks()

    const builder = new Builder()
    builder.nuxt = new Nuxt()
    await Nuxt.fileRestartHook(builder)
    expect(consola.log).toHaveBeenCalled()

    expect(Builder.prototype.build).toHaveBeenCalled()
    expect(Nuxt.prototype.close).toHaveBeenCalled()
    expect(Nuxt.prototype.server.listen).toHaveBeenCalled()

    expect(consola.error).not.toHaveBeenCalled()
  })

  test('catches build error', async () => {
    const Nuxt = mockNuxt()
    const Builder = mockBuilder()

    await NuxtCommand.from(dev).run()
    jest.clearAllMocks()

    // Test error on second build so we cover oldInstance stuff
    const builder = new Builder()
    builder.nuxt = new Nuxt()
    Builder.prototype.build = jest.fn().mockImplementationOnce(() => Promise.reject(new Error('Build Error')))
    await Nuxt.fileRestartHook(builder)

    expect(Nuxt.prototype.close).toHaveBeenCalled()
    expect(consola.error).toHaveBeenCalledWith(new Error('Build Error'))
  })

  test.skip('catches watchRestart error', async () => {
    const Nuxt = mockNuxt()
    const Builder = mockBuilder()

    await NuxtCommand.from(dev).run()
    jest.clearAllMocks()

    const builder = new Builder()
    builder.nuxt = new Nuxt()
    Builder.prototype.watchRestart = jest.fn().mockImplementationOnce(() => Promise.reject(new Error('watchRestart Error')))
    await Nuxt.fileRestartHook(builder)

    expect(consola.error).toHaveBeenCalledWith(new Error('watchRestart Error'))
    expect(Builder.prototype.watchRestart).toHaveBeenCalledTimes(2)
  })

  test('catches error on hook error', async () => {
    const Nuxt = mockNuxt()
    const Builder = mockBuilder()

    await NuxtCommand.from(dev).run()
    jest.clearAllMocks()

    mockGetNuxtConfig().mockImplementationOnce(() => {
      throw new Error('Config Error')
    })
    const builder = new Builder()
    builder.nuxt = new Nuxt()
    await Nuxt.fileRestartHook(builder)

    expect(consola.error).toHaveBeenCalledWith(new Error('Config Error'))
    // expect(Builder.prototype.watchRestart).toHaveBeenCalledTimes(1)
  })

  test('catches error on startDev', async () => {
    mockNuxt({
      server: {
        listen: jest.fn().mockImplementation(() => {
          throw new Error('Listen Error')
        })
      }
    })
    mockBuilder()

    await NuxtCommand.from(dev).run()

    expect(consola.error).toHaveBeenCalledWith(new Error('Listen Error'))
  })
})
