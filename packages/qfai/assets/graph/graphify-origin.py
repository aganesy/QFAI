"""Run Graphify with its network access held to one approved processing origin.

Usage: graphify-origin.py <origin URL> <Graphify arguments...>

An audit hook refuses every name lookup, connection and datagram that does not
target the origin's host and port, so a redirect, a fallback provider or any
other request cannot carry documents to a destination nobody approved.
"""

import ipaddress
import runpy
import socket
import sys
from urllib.parse import urlsplit

REFUSAL = "Graphify network access outside the approved processing origin was refused."
CHECKED_EVENTS = ("socket.getaddrinfo", "socket.connect", "socket.sendto", "socket.sendmsg")


def approved_origin(url):
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ValueError("Unsupported processing origin")
    return parts.hostname.lower(), parts.port or (443 if parts.scheme == "https" else 80)


def address_text(value):
    if not isinstance(value, str):
        return None
    try:
        return str(ipaddress.ip_address(value.split("%", 1)[0]))
    except ValueError:
        return None


def host_text(value):
    if isinstance(value, bytes):
        value = value.decode("ascii", "replace")
    if not isinstance(value, str):
        return None
    return address_text(value.strip("[]")) or value.strip("[]").lower()


def resolved_addresses(host, port):
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError:
        # An origin that does not resolve leaves no address to reach; every connection fails.
        return set()
    return {text for text in (address_text(info[4][0]) for info in infos) if text}


def origin_hook(host, port):
    addresses = resolved_addresses(host, port)
    names = {host} | addresses

    def port_allowed(value):
        if value is None:
            return True
        try:
            return int(value) in (0, port)
        except (TypeError, ValueError):
            return False

    def allowed(event, args):
        if event == "socket.getaddrinfo":
            return host_text(args[0]) in names and port_allowed(args[1])
        address = args[1] if len(args) > 1 else None
        if address is None:
            # A send on a connected socket: its connection already passed this hook.
            return event != "socket.connect"
        return (
            isinstance(address, tuple)
            and len(address) >= 2
            and address_text(address[0]) in addresses
            and address[1] == port
        )

    def hook(event, args):
        if event in CHECKED_EVENTS and not allowed(event, args):
            raise PermissionError(REFUSAL)

    return hook


def main():
    if len(sys.argv) < 3:
        sys.stderr.write("Usage: graphify-origin.py <origin URL> <Graphify arguments...>\n")
        sys.exit(2)
    host, port = approved_origin(sys.argv[1])
    sys.addaudithook(origin_hook(host, port))
    sys.argv = ["graphify", *sys.argv[2:]]
    runpy.run_module("graphify", run_name="__main__", alter_sys=True)


if __name__ == "__main__":
    main()
