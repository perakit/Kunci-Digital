function generatePassword(length: number, includeLower: boolean, includeUpper: boolean, includeNumber: boolean, includeSymbol: boolean) {
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()';

    let charPool = '';
    if (includeLower) charPool += lowerChars;
    if (includeUpper) charPool += upperChars;
    if (includeNumber) charPool += numberChars;
    if (includeSymbol) charPool += symbolChars;

    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charPool.length);
        password += charPool[randomIndex];
    }

    return password;
}

export { generatePassword };
export default generatePassword;