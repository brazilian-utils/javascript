module benchgo

go 1.23.5

toolchain go1.24.7

require (
	coreout v0.0.0-00010101000000-000000000000
	github.com/brazilian-utils/go v0.0.0-00010101000000-000000000000
)

replace coreout => ../../out/go

replace github.com/brazilian-utils/go => ../../../../brazilian-utils/go
