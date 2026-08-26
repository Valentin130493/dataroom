import {
  ROOT_PATH,
  ancestorIds,
  childDepth,
  childPath,
  isDescendantOf,
  rebuildPath,
  subtreePrefix,
} from './node-path';

const root = { id: 'a', path: ROOT_PATH, depth: 0 };
const child = { id: 'b', path: '/a/', depth: 1 };
const grandChild = { id: 'c', path: '/a/b/', depth: 2 };

describe('childPath', () => {
  it('returns the root path when there is no parent', () => {
    expect(childPath(null)).toBe(ROOT_PATH);
  });

  it('appends the parent id to the parent path', () => {
    expect(childPath(child)).toBe('/a/b/');
  });
});

describe('childDepth', () => {
  it('starts at zero under the data room root', () => {
    expect(childDepth(null)).toBe(0);
  });

  it('increments the parent depth', () => {
    expect(childDepth(grandChild)).toBe(3);
  });
});

describe('ancestorIds', () => {
  it('is empty for a root-level node', () => {
    expect(ancestorIds(root)).toEqual([]);
  });

  it('lists ancestors from the root down', () => {
    expect(ancestorIds(grandChild)).toEqual(['a', 'b']);
  });
});

describe('isDescendantOf', () => {
  it('detects a nested node', () => {
    expect(isDescendantOf(grandChild, root)).toBe(true);
  });

  it('rejects a sibling', () => {
    expect(isDescendantOf({ id: 'x', path: '/a/', depth: 1 }, child)).toBe(false);
  });

  it('does not treat a node as its own descendant', () => {
    expect(isDescendantOf(child, child)).toBe(false);
  });

  it('is not fooled by an id prefix', () => {
    expect(isDescendantOf({ id: 'z', path: '/ab/', depth: 1 }, root)).toBe(false);
  });
});

describe('rebuildPath', () => {
  it('re-roots a descendant path onto the new prefix', () => {
    const oldPrefix = subtreePrefix(child);
    const newPrefix = '/x/b/';

    expect(rebuildPath('/a/b/c/', oldPrefix, newPrefix)).toBe('/x/b/c/');
  });
});
