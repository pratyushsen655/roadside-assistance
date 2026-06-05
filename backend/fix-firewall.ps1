# PowerShell script to configure Windows Firewall for local development
# Run this script as Administrator

function Add-ProgramRule {
    param(
        [string]$Name,
        [string]$ProgramPath,
        [string]$Direction
    )
    $existing = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
    if (-not $existing) {
        New-NetFirewallRule -DisplayName $Name -Direction $Direction -Program $ProgramPath -Action Allow -Profile Any
        Write-Host "Created $Direction rule for $ProgramPath"
    } else {
        Write-Host "$Direction rule $Name already exists."
    }
}

# Determine path to node.exe (assumes node is in PATH)
$nodePath = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    Write-Warning "node.exe not found in PATH. Skipping program rules."
} else {
    Add-ProgramRule -Name "Allow Node.js Inbound" -ProgramPath $nodePath -Direction Inbound
    Add-ProgramRule -Name "Allow Node.js Outbound" -ProgramPath $nodePath -Direction Outbound
}

# Open required ports for development
$ports = @(5000, 5001, 5002, 27017)
foreach ($port in $ports) {
    foreach ($dir in @('Inbound', 'Outbound')) {
        $ruleName = "Allow Port $port $dir"
        $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        if (-not $existing) {
            New-NetFirewallRule -DisplayName $ruleName -Direction $dir -LocalPort $port -Protocol TCP -Action Allow -Profile Any
            Write-Host "Created $dir rule for port $port"
        }
    }
}

# Allow localhost traffic (IPv4 & IPv6)
$localRuleName = "Allow Localhost Traffic"
$existing = Get-NetFirewallRule -DisplayName $localRuleName -ErrorAction SilentlyContinue
if (-not $existing) {
    New-NetFirewallRule -DisplayName $localRuleName -Direction Inbound -RemoteAddress 127.0.0.1,::1 -Protocol Any -Action Allow -Profile Any
    New-NetFirewallRule -DisplayName $localRuleName -Direction Outbound -RemoteAddress 127.0.0.1,::1 -Protocol Any -Action Allow -Profile Any
    Write-Host "Created localhost allow rules."
} else {
    Write-Host "Localhost rule already exists."
}

# Verification of created rules
Write-Host "\nVerification of created firewall rules:"
Get-NetFirewallRule -DisplayName "Allow Node.js*" -ErrorAction SilentlyContinue | Format-Table -AutoSize
Get-NetFirewallRule -DisplayName "Allow Port*" -ErrorAction SilentlyContinue | Format-Table -AutoSize
Get-NetFirewallRule -DisplayName $localRuleName -ErrorAction SilentlyContinue | Format-Table -AutoSize
