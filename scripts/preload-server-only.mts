// @ts-nocheck
import Module from 'node:module';

const originalLoad = Module._load as (
  request: string,
  parent: NodeModule,
  isMain: boolean,
) => unknown;

Module._load = function patchedLoad(
  request: string,
  parent: NodeModule,
  isMain: boolean,
) {
  if (request === 'server-only') {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};
