// Types for the result object with discriminated union
type Success<T> = {
  data: T;
  error: undefined;
};

type Failure<E> = {
  data: undefined;
  error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;

// Main wrapper function
export async function tryCatch<T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: undefined };
  } catch (error) {
    return { data: undefined, error: error as E };
  }
}
