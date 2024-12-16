import * as openpgp from 'openpgp';

interface Result{
    status: string;
    message: string;
}

class SymmetricPGPEncryption {
	private password;

	constructor(passowrd: string) {
		this.password = passowrd;
	}

	// Remove PGP headers from encrypted message
	private stripPGPHeaders = (armoredMessage: string) => {
		const headersRegex =
			/^-----BEGIN PGP MESSAGE-----\n\n([\s\S]*?)\n=\w+\n-----END PGP MESSAGE-----$/m;
		const match = armoredMessage.match(headersRegex);
		return match ? match[1].trim() : armoredMessage.trim();
	};

	// Add PGP headers back to the message for decryption
	private addPGPHeaders = (strippedMessage: string) => {
		// Generate a simple checksum (this is a placeholder - real PGP would use a more complex method)
		const checksum = 'qW3k';
		return `-----BEGIN PGP MESSAGE-----

${strippedMessage}
=${checksum}
-----END PGP MESSAGE-----`;
	};

    private setError(message: string): Result {
        return {
            "status": "error",
            "message": message,
        };
    }
    
    private setSuccess(message: string): Result {
        return {
            "status": "success",
            "message": message,
        };
    }

	// Symmetric Encryption Function
	public encryptMessage = async (plaintext: string) => {
		try {
			// Validate inputs
			if (!this.password.trim()) {
				return this.setError('Password cannot be empty');
			}
			if (!plaintext.trim()) {
				return this.setError('Message cannot be empty');
			}

			// Encrypt the message symmetrically
			const encrypted = await openpgp.encrypt({
				message: await openpgp.createMessage({ text: plaintext }),
				passwords: [this.password],
				format: 'armored',
			});

			return this.setSuccess(this.stripPGPHeaders(encrypted));
		} catch (error) {
            if (error instanceof Error) {
			    return this.setError(`Encryption failed: ${error.message}`);
            } else {
                return this.setError("Caught an unknown error: " + error);
            }
		}
	};

	// Symmetric Decryption Function
	public decryptMessage = async (encryptedMessage: string) => {
		try {
			// Validate inputs
			if (!this.password.trim()) {
				return this.setError('Password cannot be empty');
			}
			if (!encryptedMessage.trim()) {
				return this.setError('No encrypted message to decrypt');
			}

			const msgWithPGPHeader = this.addPGPHeaders(encryptedMessage);

			// Decrypt the message symmetrically
			const decrypted = await openpgp.decrypt({
				message: await openpgp.readMessage({
					armoredMessage: msgWithPGPHeader,
				}),
				passwords: [this.password],
			});

			return this.setSuccess(decrypted.data);
		} catch (error) {
            if (error instanceof Error) {
			    return this.setError(`Decryption failed: ${error.message}`);
            } else {
                return this.setError("Caught an unknown error: " + error);
            }
		}
	};
}

export default SymmetricPGPEncryption;