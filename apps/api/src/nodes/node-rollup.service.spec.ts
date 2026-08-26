import { NodeType } from '@prisma/client';
import { NodeRollupService } from './node-rollup.service';

describe('NodeRollupService', () => {
  const service = new NodeRollupService();

  const file = {
    type: NodeType.FILE,
    size: 2048,
    subtreeSize: 2048n,
    subtreeFileCount: 1,
    subtreeFolderCount: 0,
  };

  const folder = {
    type: NodeType.FOLDER,
    size: 0,
    subtreeSize: 5000n,
    subtreeFileCount: 3,
    subtreeFolderCount: 2,
  };

  it('weighs a file by its own size', () => {
    expect(service.weightOf(file)).toEqual({ size: 2048n, files: 1, folders: 0 });
  });

  it('counts the folder itself on top of its subtree', () => {
    expect(service.weightOf(folder)).toEqual({ size: 5000n, files: 3, folders: 3 });
  });

  it('negates every component', () => {
    const negated = service.negate(service.weightOf(file));

    expect(negated.size).toBe(-2048n);
    expect(negated.files).toBe(-1);
    expect(Math.abs(negated.folders)).toBe(0);
  });

  it('skips the update when there are no ancestors', async () => {
    const tx = { node: { updateMany: jest.fn() } };

    await service.shift(tx as never, [], service.weightOf(file));

    expect(tx.node.updateMany).not.toHaveBeenCalled();
  });

  it('skips the update when the weight is zero', async () => {
    const tx = { node: { updateMany: jest.fn() } };

    await service.shift(tx as never, ['a'], { size: 0n, files: 0, folders: 0 });

    expect(tx.node.updateMany).not.toHaveBeenCalled();
  });

  it('increments every ancestor in one statement', async () => {
    const tx = { node: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) } };

    await service.shift(tx as never, ['a', 'b'], service.weightOf(file));

    expect(tx.node.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] } },
      data: {
        subtreeSize: { increment: 2048n },
        subtreeFileCount: { increment: 1 },
        subtreeFolderCount: { increment: 0 },
      },
    });
  });
});
