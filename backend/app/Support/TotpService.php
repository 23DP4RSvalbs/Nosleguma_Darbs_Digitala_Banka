<?php

namespace App\Support;

class TotpService
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function generateSecret(int $length = 32): string
    {
        $secret = '';
        $maxIndex = strlen(self::ALPHABET) - 1;

        for ($i = 0; $i < $length; $i++) {
            $secret .= self::ALPHABET[random_int(0, $maxIndex)];
        }

        return $secret;
    }

    public function buildOtpAuthUri(string $issuer, string $label, string $secret): string
    {
        $encodedLabel = rawurlencode($label);
        $encodedIssuer = rawurlencode($issuer);

        return sprintf(
            'otpauth://totp/%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
            $encodedLabel,
            $secret,
            $encodedIssuer
        );
    }

    public function verifyCode(string $secret, string $code, int $window = 1): bool
    {
        if (! preg_match('/^\d{6}$/', $code)) {
            return false;
        }

        $counter = (int) floor(time() / 30);

        for ($offset = -$window; $offset <= $window; $offset++) {
            if (hash_equals($this->generateCode($secret, $counter + $offset), $code)) {
                return true;
            }
        }

        return false;
    }

    public function currentCode(string $secret, ?int $timestamp = null): string
    {
        $counter = (int) floor(($timestamp ?? time()) / 30);

        return $this->generateCode($secret, $counter);
    }

    private function generateCode(string $secret, int $counter): string
    {
        $secretBytes = $this->decodeBase32($secret);
        $counterBytes = pack('N*', 0, $counter);
        $hmac = hash_hmac('sha1', $counterBytes, $secretBytes, true);

        $offset = ord(substr($hmac, -1)) & 0x0f;
        $segment = substr($hmac, $offset, 4);
        $value = unpack('N', $segment)[1] & 0x7fffffff;

        return str_pad((string) ($value % 1000000), 6, '0', STR_PAD_LEFT);
    }

    private function decodeBase32(string $input): string
    {
        $clean = strtoupper(preg_replace('/[^A-Z2-7]/', '', $input) ?? '');
        $bits = '';

        $length = strlen($clean);
        for ($i = 0; $i < $length; $i++) {
            $value = strpos(self::ALPHABET, $clean[$i]);
            if ($value === false) {
                continue;
            }

            $bits .= str_pad(decbin($value), 5, '0', STR_PAD_LEFT);
        }

        $bytes = '';
        $bitLength = strlen($bits);
        for ($i = 0; $i + 8 <= $bitLength; $i += 8) {
            $bytes .= chr(bindec(substr($bits, $i, 8)));
        }

        return $bytes;
    }
}
