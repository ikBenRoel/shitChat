function isStringValid(str) {
    if (!str) return false;
    const forbiddenCharacters = ['<', '>', '(', ')', '{', '}', '[', ']', '=', '+', '-', '*', '/', '\\', '|', '&', '^', '%', '$', '#', '!', '~', '`', '?', ':', ';', '"', "'", ',', '.', ' '];
    return !forbiddenCharacters.some(char => str.includes(char));
}
export { isStringValid };