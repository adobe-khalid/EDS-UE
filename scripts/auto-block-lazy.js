/**
 * Builds all synthetic blocks in a container element.
 */
const buildAutoBlocksLazy = (main) => {
  try {
    // call all the block which should be rendered lazily here
    if (main) {
      // Add lazy block logic here
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
};

export default buildAutoBlocksLazy;
