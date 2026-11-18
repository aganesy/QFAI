"""Run Graphify with its network access held to one approved processing origin.

Usage: graphify-origin.py <origin URL> <Graphify arguments...>

An audit hook refuses every name lookup, connection and datagram that does not
target the origin's host name and port, so a redirect, a fallback provider or
any other request cannot carry documents to a destination nobody approved. A
different host name is refused even when it resolves to the same address, and
reverse lookups are refused outright, since a lookup can carry data itself.
"""

import ipaddress
import runpy
import socket
import sys
from urllib.parse import urlsplit

REFUSAL = "Graphify network access outside the approved processing origin was refused."
FORWARD_LOOKUPS = ("socket.gethostbyname", "socket.gethostbyname_ex")
REVERSE_LOOKUPS = ("socket.gethostbyaddr", "socket.getnameinfo")
TRAFFIC = ("socket.connect", "socket.sendto", "socket.sendmsg")


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
    bare = value.strip("[]")
    return address_text(bare) or bare.lower().rstrip(".")


def approved_origin(url):
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ValueError("Unsupported processing origin")
    return host_text(parts.hostname), parts.port or (443 if parts.scheme == "https" else 80)


def resolved_addresses(host, port):
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError:
        # An origin that does not resolve leaves no address to reach; every connection fails.
        return set()
    return {text for text in (address_text(info[4][0]) for info in infos) if text}


def origin_hook(host, port):
    # Connections may reach only the addresses the approved name resolves to, and only a
    # lookup of that exact name yields them: another name for the same address is refused.
    addresses = resolved_addresses(host, port)

    def port_allowed(value):
        if value is None:
            return True
        try:
            return int(value) in (0, port)
        except (TypeError, ValueError):
            return False

    def allowed(event, args):
        if event == "socket.getaddrinfo":
            return host_text(args[0]) == host and port_allowed(args[1])
        if event in FORWARD_LOOKUPS:
            return host_text(args[0]) == host
        if event in REVERSE_LOOKUPS:
            return False
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
        if event in CHECKED and not allowed(event, args):
            raise PermissionError(REFUSAL)

    return hook


CHECKED = frozenset(("socket.getaddrinfo", *FORWARD_LOOKUPS, *REVERSE_LOOKUPS, *TRAFFIC))


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
