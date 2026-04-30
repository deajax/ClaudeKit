import { resolve } from 'path'
import { readFileSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'))

export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin()],
		build: {
			rollupOptions: {
				input: {
					index: resolve('electron/main.ts')
				}
			}
		},
		resolve: {
			alias: {
				'@shared': resolve('shared')
			}
		}
	},
	preload: {
		plugins: [externalizeDepsPlugin()],
		build: {
			rollupOptions: {
				input: {
					index: resolve('electron/preload.ts')
				}
			}
		},
		resolve: {
			alias: {
				'@shared': resolve('shared')
			}
		}
	},
	renderer: {
		root: '.',
		build: {
			rollupOptions: {
				input: {
					index: resolve('index.html')
				}
			}
		},
		resolve: {
			alias: {
				'@': resolve('src'),
				'@shared': resolve('shared')
			}
		},
		define: {
				__APP_VERSION__: JSON.stringify(pkg.version)
			},
			plugins: [vue(), tailwindcss(), Components({ resolvers: [AntDesignVueResolver({ importStyle: false, resolveIcons: false })] })],
		css: {
			preprocessorOptions: {
				less: {
					javascriptEnabled: true
				}
			}
		}
	}
})
