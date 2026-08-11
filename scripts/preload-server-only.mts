import Module from 'node:module';

type ModuleLoad = (
  request: string,
  parent: NodeModule,
  isMain: boolean,
) => unknown;

// Node internal hook used only in CLI test preload scripts.
const moduleWithLoad = Module as typeof Module & { _load: ModuleLoad };
const originalLoad = moduleWithLoad._load;

moduleWithLoad._load = function patchedLoad(
  request: string,
  parent: NodeModule,
  isMain: boolean,
) {
  if (request === 'server-only') {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};
